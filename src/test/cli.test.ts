import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { startServer } from "./server";
import { graphqlRequests, requests } from "./handlers";

let testServer: Awaited<ReturnType<typeof startServer>>;
let baseUrl: string;

const runCli = (
  args: string[]
): Promise<{ code: number | null; stdout: string; stderr: string }> =>
  new Promise((resolveRun, rejectRun) => {
    const child = spawn(
      process.execPath,
      [resolve(process.cwd(), "dist/cli.js"), ...args],
      { cwd: process.cwd() }
    );
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", rejectRun);
    child.on("close", (code) => resolveRun({ code, stdout, stderr }));
  });

beforeAll(async () => {
  testServer = await startServer(0);
  baseUrl = testServer.url;
});

afterAll(
  () =>
    new Promise<void>((resolveClose, rejectClose) => {
      testServer.server.close((error) =>
        error ? rejectClose(error) : resolveClose()
      );
    })
);

describe("CLI", () => {
  it("paginates through responses and extracts items from a nested path", async () => {
    requests.length = 0;

    const result = await runCli([
      `${baseUrl}/pages`,
      "-i",
      "data.items",
      "--params.page",
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("'one'");
    expect(result.stdout).toContain("'two'");
    expect(result.stdout).not.toContain("not an item");
    expect(requests).toEqual(["1", "2", "3"]);
  });

  it("extracts items with -i from a nested response path", async () => {
    const result = await runCli([`${baseUrl}/nested`, "-i", "payload.results"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("'nested-item'");
    expect(result.stdout).not.toContain("not an item");
  });

  it("paginates GraphQL responses using a query and cursor path", async () => {
    graphqlRequests.length = 0;
    const query =
      "query Products($cursor: String) { products(after: $cursor) { nodes pageInfo { endCursor } } }";

    const result = await runCli([
      `${baseUrl}/graphql`,
      "--graphql",
      query,
      "--cursor",
      "data.products.pageInfo.endCursor",
      "-i",
      "data.products.nodes",
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("'product-1'");
    expect(result.stdout).toContain("'product-2'");
    expect(result.stdout).toContain("'product-3'");
    expect(graphqlRequests).toEqual([
      { query, cursor: undefined },
      { query, cursor: "cursor-1" },
      { query, cursor: "cursor-2" },
    ]);
  });

  it("prints help and exits with an error when the URL is missing", async () => {
    const result = await runCli([]);

    expect(result.code).toBe(1);
    expect(result.stdout + result.stderr).toContain("<url>");
    expect(result.stderr).toContain("Options:");
  });
});

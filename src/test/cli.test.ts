import { spawn } from "node:child_process";
import { createServer, IncomingMessage, Server, ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { resolve } from "node:path";

const server: Server = createServer(
  (request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (url.pathname === "/pages") {
      const page = url.searchParams.get("page") ?? "1";
      requests.push(page);
      const items: string[] =
        page === "1" ? ["one"] : page === "2" ? ["two"] : [];

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ data: { items }, ignored: "not an item" }));
      return;
    }

    if (url.pathname === "/nested") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          payload: { results: ["nested-item"] },
          ignored: "not an item",
        })
      );
      return;
    }

    response.writeHead(404);
    response.end();
  }
);

const requests: string[] = [];
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

beforeAll(
  () =>
    new Promise<void>((resolveListen, rejectListen) => {
      server.once("error", rejectListen);
      server.listen(0, "127.0.0.1", () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolveListen();
      });
    })
);

afterAll(
  () =>
    new Promise<void>((resolveClose, rejectClose) => {
      server.close((error) => (error ? rejectClose(error) : resolveClose()));
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

  it("prints help and exits with an error when the URL is missing", async () => {
    const result = await runCli([]);

    expect(result.code).toBe(1);
    expect(result.stdout + result.stderr).toContain("<url>");
    expect(result.stderr).toContain("Options:");
  });
});

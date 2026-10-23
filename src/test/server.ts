import express from "express";
import type { Server } from "node:http";
import { resolve } from "node:path";

const items = [
  { name: "one" },
  { name: "two" },
  { name: "three" },
  { name: "four" },
];

export const startServer = async (port = 54321) => {
  const app = express();
  const requests: string[] = [];
  const graphqlRequests: Array<{ query: string; cursor?: string }> = [];

  app.use(express.json());

  app.get("/pages", (req, res) => {
    const page = (req.query.page as string) ?? "1";
    requests.push(page);

    if (page === "1" || page === "2") {
      const pageItems = page === "1" ? items.slice(0, 2) : items.slice(2);
      return res.json({
        items: pageItems,
        data: { items: pageItems.map(({ name }) => name) },
      });
    }

    res.status(404).end();
  });

  app.get("/nested", (_req, res) => {
    res.json({
      payload: { results: ["nested-item"] },
      ignored: "not an item",
    });
  });

  app.post("/graphql", (req, res) => {
    const { query, variables } = req.body;
    const cursor = variables?.cursor;
    graphqlRequests.push({ query, cursor });
    const page = cursor === "cursor-1" ? 2 : cursor === "cursor-2" ? 3 : 1;

    res.json({
      data: {
        products: {
          nodes: [`product-${page}`],
          pageInfo: { endCursor: page < 3 ? `cursor-${page}` : null },
        },
      },
    });
  });

  app.get("/pg", (req, res) => {
    const page = (req.query.pg as string) ?? "1";

    if (page === "1") {
      return res.json({ items: items.slice(0, 2) });
    } else if (page === "2") {
      return res.json({ items: items.slice(2) });
    }

    res.status(404).end();
  });

  const respondWithOffsetItems = (
    offsetParam: string,
    limitParam: string,
    req: express.Request,
    res: express.Response
  ) => {
    const offset = parseInt((req.query[offsetParam] as string) ?? "0", 10);
    const limit = parseInt((req.query[limitParam] as string) ?? "2", 10);
    const pageItems = items.slice(offset, offset + limit);

    if (pageItems.length) {
      return res.json({ items: pageItems });
    }

    res.status(404).end();
  };

  app.get("/offset", (req, res) =>
    respondWithOffsetItems("offset", "limit", req, res)
  );
  app.get("/ofs", (req, res) =>
    respondWithOffsetItems("ofs", "lmt", req, res)
  );

  const server: Server = await new Promise((resolveListen, rejectListen) => {
    const listeningServer = app.listen(port, "127.0.0.1", () =>
      resolveListen(listeningServer)
    );
    listeningServer.once("error", rejectListen);
  });
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Could not determine test server address");
  }

  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
    requests,
    graphqlRequests,
  };
};

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve("src/test/server.ts")
) {
  startServer()
    .then(({ url }) => console.log(url))
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}

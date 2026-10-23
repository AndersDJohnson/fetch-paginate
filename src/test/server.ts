import express from "express";
import { createMiddleware } from "@msw/serve/express";
import type { Server } from "node:http";
import { resolve } from "node:path";
import { graphqlRequests, handlers, requests } from "./handlers.ts";

export const startServer = async (port = 54321) => {
  const app = express();
  app.use(createMiddleware(...handlers));
  app.use((_req, res) => res.status(404).end());

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

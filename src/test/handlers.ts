import { http, HttpResponse } from "msw";

export const base = "http://api.example.com";

export const requests: string[] = [];
export const graphqlRequests: Array<{ query: string; cursor?: string }> = [];

const items = ["one", "two", "three"];
const linkedHeaders = (page: number) => ({
  Link:
    page === 1
      ? '<http://api.example.com/linked?page=2>; rel="next", <http://api.example.com/linked?page=3>; rel="last"'
      : page === 2
      ? '<http://api.example.com/linked?page=3>; rel="next", <http://api.example.com/linked?page=3>; rel="last"'
      : '<http://api.example.com/linked?page=3>; rel="last"',
});

const pagedResponse = (page: number) =>
  HttpResponse.json({ list: [items[page - 1]] });

const offsetResponse = (
  requestUrl: URL,
  offsetName: string,
  limitName: string,
  emptyEnd = false
) => {
  const offset = Number(requestUrl.searchParams.get(offsetName) ?? 0);
  const limit = Number(requestUrl.searchParams.get(limitName) ?? 1);
  const pageItems = items.slice(offset, offset + limit);

  if (pageItems.length || (emptyEnd && offset === items.length)) {
    return HttpResponse.json({ list: pageItems });
  }

  return new HttpResponse(null, { status: 404 });
};

export const handlers = [
  http.get("*/one", () => HttpResponse.json({ list: ["one"] })),
  http.get("*/headers", ({ request }) => {
    if (request.headers.get("Test") !== "Yes") {
      return HttpResponse.error();
    }

    return HttpResponse.json({ list: ["one"] });
  }),
  http.get("*/linked", ({ request }) => {
    const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
    return HttpResponse.json(
      { list: [items[page - 1]] },
      { headers: linkedHeaders(page) }
    );
  }),
  http.get("*/paged", ({ request }) => {
    const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
    return page >= 1 && page <= 3
      ? pagedResponse(page)
      : new HttpResponse(null, { status: 404 });
  }),
  http.get("*/paged-0", ({ request }) => {
    const page = Number(new URL(request.url).searchParams.get("page") ?? 0);
    return page >= 0 && page <= 2
      ? HttpResponse.json({ list: [items[page]] })
      : new HttpResponse(null, { status: 404 });
  }),
  http.get("*/paged-empty-end", ({ request }) => {
    const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
    return page >= 1 && page <= 3
      ? pagedResponse(page)
      : page === 4
      ? HttpResponse.json({ list: [] })
      : new HttpResponse(null, { status: 404 });
  }),
  http.get("*/pages", ({ request }) => {
    const page = new URL(request.url).searchParams.get("page") ?? "1";
    requests.push(page);
    const pageItems = page === "1" ? ["one", "two"] : ["three", "four"];

    return page === "1" || page === "2"
      ? HttpResponse.json({
          items: pageItems.map((name) => ({ name })),
          data: { items: pageItems },
        })
      : new HttpResponse(null, { status: 404 });
  }),
  http.get("*/offset", ({ request }) =>
    offsetResponse(new URL(request.url), "offset", "limit")
  ),
  http.get("*/offset-limit", ({ request }) =>
    offsetResponse(new URL(request.url), "offset", "limit")
  ),
  http.get("*/offset-empty-end", ({ request }) =>
    offsetResponse(new URL(request.url), "offset", "limit", true)
  ),
  http.get("*/pg", ({ request }) => {
    const page = Number(new URL(request.url).searchParams.get("pg") ?? 1);
    return page >= 1 && page <= 2
      ? HttpResponse.json({
          items: page === 1 ? items.slice(0, 2) : items.slice(2),
        })
      : new HttpResponse(null, { status: 404 });
  }),
  http.get("*/ofs", ({ request }) =>
    offsetResponse(new URL(request.url), "ofs", "lmt")
  ),
  http.get("*/hateoas", () =>
    HttpResponse.json({
      list: ["one"],
      _links: { next: { href: "/hateoas/2" } },
    })
  ),
  http.get("*/hateoas/2", () =>
    HttpResponse.json({
      list: ["two"],
      _links: { next: { href: "/hateoas/3" } },
    })
  ),
  http.get("*/hateoas/3", () =>
    HttpResponse.json({ list: ["three"], _links: {} })
  ),
  http.get("*/hateoas-links", () =>
    HttpResponse.json({
      list: ["one"],
      _links: { more: { href: "/hateoas-links/2" } },
    })
  ),
  http.get("*/hateoas-links/2", () =>
    HttpResponse.json({ list: ["two"], _links: {} })
  ),
  http.get("*/cursor", ({ request }) => {
    const cursor = new URL(request.url).searchParams.get("cursor");
    const page = cursor === "cursor-1" ? 2 : cursor === "cursor-2" ? 3 : 1;
    return HttpResponse.json({
      list: [items[page - 1]],
      nextCursor: page < 3 ? `cursor-${page}` : null,
    });
  }),
  http.get("*/cursor-custom", ({ request }) => {
    const cursor = new URL(request.url).searchParams.get("after");
    const page = cursor === "cursor-1" ? 2 : 1;
    return HttpResponse.json({
      list: [items[page - 1]],
      nextCursor: page === 1 ? "cursor-1" : null,
    });
  }),
  http.get("*/cursor-start", ({ request }) => {
    const cursor = new URL(request.url).searchParams.get("cursor");
    return cursor === "cursor-1"
      ? HttpResponse.json({ list: ["two"], nextCursor: "cursor-2" })
      : HttpResponse.json({ list: ["three"], nextCursor: null });
  }),
  http.get("*/cursor-start-zero", ({ request }) => {
    const cursor = new URL(request.url).searchParams.get("cursor");
    return cursor === "0"
      ? HttpResponse.json({ list: ["zero"], nextCursor: "1" })
      : HttpResponse.json({ list: ["one"], nextCursor: null });
  }),
  http.get("*/cursor-empty", ({ request }) => {
    const cursor = new URL(request.url).searchParams.get("cursor");
    return cursor === "cursor-1"
      ? HttpResponse.json({ list: ["two"], nextCursor: null })
      : HttpResponse.json({ list: [], nextCursor: "cursor-1" });
  }),
  http.get("*/nested", () =>
    HttpResponse.json({
      payload: { results: ["nested-item"] },
      ignored: "not an item",
    })
  ),
  http.post("*/graphql", async ({ request }) => {
    const body = (await request.json()) as {
      query: string;
      variables?: { cursor?: string; page?: number };
    };

    if (body.query.includes("query Products")) {
      const cursor = body.variables?.cursor;
      graphqlRequests.push({ query: body.query, cursor });
      const page = cursor === "cursor-1" ? 2 : cursor === "cursor-2" ? 3 : 1;

      return HttpResponse.json({
        data: {
          products: {
            list: [`p${page}`],
            nodes: [`product-${page}`],
            pageInfo: {
              endCursor: page < 3 ? `cursor-${page}` : null,
              hasNextPage: page < 3,
            },
          },
        },
      });
    }

    const page = body.variables?.page ?? 1;
    return HttpResponse.json({
      data: {
        products: {
          list: [`p${page}`],
          nextPage: page < 3 ? page + 1 : null,
        },
      },
    });
  }),
];

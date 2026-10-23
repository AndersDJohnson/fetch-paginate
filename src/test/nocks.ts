import nock from "nock";

export const base = "http://api.example.com";

nock(base).get("/one").times(Infinity).reply(200, '{ "list": ["one"] }');

nock(base, {
  reqheaders: {
    Test: 'Yes',
  },
}).get("/headers").times(Infinity).reply(200, '{ "list": ["one"] }');

nock(base)
  .get("/linked")
  .times(Infinity)
  .reply(200, '{ "list": ["one"] }', {
    Link:
      '<http://api.example.com/linked?page=2>; rel="next", ' +
      '<http://api.example.com/linked?page=3>; rel="last"',
  })
  .get("/linked")
  .times(Infinity)
  .query({ page: "2" })
  .reply(200, '{ "list": ["two"] }', {
    Link:
      '<http://api.example.com/linked?page=3>; rel="next", ' +
      '<http://api.example.com/linked?page=3>; rel="last"',
  })
  .get("/linked")
  .times(Infinity)
  .query({ page: "3" })
  .reply(200, '{ "list": ["three"] }', {
    Link: '<http://api.example.com/linked?page=3>; rel="last"',
  });

nock(base)
  .get("/paged")
  .query({ page: "1" })
  .times(Infinity)
  .reply(200, '{ "list": ["one"] }')
  .get("/paged")
  .times(Infinity)
  .query({ page: "2" })
  .reply(200, '{ "list": ["two"] }')
  .get("/paged")
  .times(Infinity)
  .query({ page: "3" })
  .reply(200, '{ "list": ["three"] }')
  .get("/paged")
  .times(Infinity)
  .query({ page: "4" })
  .reply(404);

nock(base)
  .get("/paged-0")
  .query({ page: "0" })
  .times(Infinity)
  .reply(200, '{ "list": ["one"] }')
  .get("/paged-0")
  .times(Infinity)
  .query({ page: "1" })
  .reply(200, '{ "list": ["two"] }')
  .get("/paged-0")
  .times(Infinity)
  .query({ page: "2" })
  .reply(200, '{ "list": ["three"] }')
  .get("/paged-0")
  .times(Infinity)
  .query({ page: "3" })
  .reply(404);

nock(base)
  .get("/paged-empty-end")
  .query({ page: "1" })
  .times(Infinity)
  .reply(200, '{ "list": ["one"] }')
  .get("/paged-empty-end")
  .times(Infinity)
  .query({ page: "2" })
  .reply(200, '{ "list": ["two"] }')
  .get("/paged-empty-end")
  .times(Infinity)
  .query({ page: "3" })
  .reply(200, '{ "list": ["three"] }')
  .get("/paged-empty-end")
  .times(Infinity)
  .query({ page: "4" })
  .reply(200, '{ "list": [] }');

nock(base)
  .get("/offset")
  .times(Infinity)
  .reply(200, '{ "list": ["one"] }')
  .get("/offset")
  .times(Infinity)
  .query({ offset: "1", limit: "1" })
  .reply(200, '{ "list": ["two"] }')
  .get("/offset")
  .times(Infinity)
  .query({ offset: "2", limit: "1" })
  .reply(200, '{ "list": ["three"] }')
  .get("/offset")
  .times(Infinity)
  .query({ offset: "3", limit: "1" })
  .reply(404);

nock(base)
  .get("/offset-limit")
  .times(Infinity)
  .query({ offset: "0", limit: "1" })
  .reply(200, '{ "list": ["one"] }')
  .get("/offset-limit")
  .times(Infinity)
  .query({ offset: "1", limit: "1" })
  .reply(200, '{ "list": ["two"] }')
  .get("/offset-limit")
  .times(Infinity)
  .query({ offset: "2", limit: "1" })
  .reply(200, '{ "list": ["three"] }')
  .get("/offset-limit")
  .times(Infinity)
  .query({ offset: "3", limit: "1" })
  .reply(404);

nock(base)
  .get("/offset-empty-end")
  .times(Infinity)
  .reply(200, '{ "list": ["one"] }')
  .get("/offset-empty-end")
  .times(Infinity)
  .query({ offset: "1", limit: "1" })
  .reply(200, '{ "list": ["two"] }')
  .get("/offset-empty-end")
  .times(Infinity)
  .query({ offset: "2", limit: "1" })
  .reply(200, '{ "list": ["three"] }')
  .get("/offset-empty-end")
  .times(Infinity)
  .query({ offset: "3", limit: "1" })
  .reply(200, '{ "list": [] }');

nock(base)
  .post("/graphql")
  .times(Infinity)
  .reply(200, (_uri, body: any) => {
    const cursor = body.variables?.cursor;
    if (body.query.includes("query Products")) {
      const page = cursor === "cursor-1" ? 2 : cursor === "cursor-2" ? 3 : 1;
      return {
        data: {
          products: {
            list: [`p${page}`],
            pageInfo: {
              endCursor: page < 3 ? `cursor-${page}` : null,
              hasNextPage: page < 3,
            },
          },
        },
      };
    }

    const page = body.variables?.page ?? 1;
    return {
      data: {
        products: {
          list: [`p${page}`],
          nextPage: page < 3 ? page + 1 : null,
        },
      },
    };
  });

nock(base)
  .get("/hateoas")
  .times(Infinity)
  .reply(200, {
    list: ["one"],
    _links: { next: { href: "/hateoas/2" } },
  })
  .get("/hateoas/2")
  .times(Infinity)
  .reply(200, {
    list: ["two"],
    _links: { next: { href: "/hateoas/3" } },
  })
  .get("/hateoas/3")
  .times(Infinity)
  .reply(200, { list: ["three"], __links: {} });

nock(base)
  .get("/hateoas-links")
  .times(Infinity)
  .reply(200, { list: ["one"], _links: { more: { href: "/hateoas-links/2" } } })
  .get("/hateoas-links/2")
  .times(Infinity)
  .reply(200, { list: ["two"], _links: {} });

import nock from "nock";

export const base = "http://api.example.com";

nock(base).get("/one").times(Infinity).reply(200, '{ "list": ["one"] }');

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
  .get("/paged-empty-end")
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

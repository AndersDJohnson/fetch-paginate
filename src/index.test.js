import "isomorphic-fetch";
import nock from "nock";
import fetchPaginate from ".";

const base = "http://api.example.com";
const linkedUrl = `${base}/linked`;
const pagedUrl = `${base}/paged`;
const pagedEmptyEndUrl = `${base}/paged-empty-end`;
const offsetUrl = `${base}/offset`;
const offsetLimitUrl = `${base}/offset-limit`;
const offsetEmptyEndUrl = `${base}/offset-empty-end`;

nock(base)
  .get("/one")
  .times(Infinity)
  .reply(200, '"one"');

nock(base)
  .get("/linked")
  .times(Infinity)
  .reply(200, '["one"]', {
    Link:
      '<http://api.example.com/linked?page=2>; rel="next", ' +
      '<http://api.example.com/linked?page=3>; rel="last"'
  })
  .get("/linked")
  .times(Infinity)
  .query({ page: "2" })
  .reply(200, '["two"]', {
    Link:
      '<http://api.example.com/linked?page=3>; rel="next", ' +
      '<http://api.example.com/linked?page=3>; rel="last"'
  })
  .get("/linked")
  .times(Infinity)
  .query({ page: "3" })
  .reply(200, '["three"]', {
    Link: '<http://api.example.com/linked?page=3>; rel="last"'
  });

nock(base)
  .get("/paged")
  .times(Infinity)
  .reply(200, '["one"]')
  .get("/paged")
  .times(Infinity)
  .query({ page: "2" })
  .reply(200, '["two"]')
  .get("/paged")
  .times(Infinity)
  .query({ page: "3" })
  .reply(200, '["three"]')
  .get("/paged")
  .times(Infinity)
  .query({ page: "4" })
  .reply(404);

nock(base)
  .get("/paged-empty-end")
  .times(Infinity)
  .reply(200, '["one"]')
  .get("/paged-empty-end")
  .times(Infinity)
  .query({ page: "2" })
  .reply(200, '["two"]')
  .get("/paged-empty-end")
  .times(Infinity)
  .query({ page: "3" })
  .reply(200, '["three"]')
  .get("/paged-empty-end")
  .times(Infinity)
  .query({ page: "4" })
  .reply(200, "[]");

nock(base)
  .get("/offset")
  .times(Infinity)
  .reply(200, '["one"]')
  .get("/offset")
  .times(Infinity)
  .query({ offset: "1", limit: "1" })
  .reply(200, '["two"]')
  .get("/offset")
  .times(Infinity)
  .query({ offset: "2", limit: "1" })
  .reply(200, '["three"]')
  .get("/offset")
  .times(Infinity)
  .query({ offset: "3", limit: "1" })
  .reply(404);

nock(base)
  .get("/offset-limit")
  .times(Infinity)
  .query({ limit: "1" })
  .reply(200, '["one"]')
  .get("/offset-limit")
  .times(Infinity)
  .query({ offset: "1", limit: "1" })
  .reply(200, '["two"]')
  .get("/offset-limit")
  .times(Infinity)
  .query({ offset: "2", limit: "1" })
  .reply(200, '["three"]')
  .get("/offset-limit")
  .times(Infinity)
  .query({ offset: "3", limit: "1" })
  .reply(404);

nock(base)
  .get("/offset-empty-end")
  .times(Infinity)
  .reply(200, '["one"]')
  .get("/offset-empty-end")
  .times(Infinity)
  .query({ offset: "1", limit: "1" })
  .reply(200, '["two"]')
  .get("/offset-empty-end")
  .times(Infinity)
  .query({ offset: "2", limit: "1" })
  .reply(200, '["three"]')
  .get("/offset-empty-end")
  .times(Infinity)
  .query({ offset: "3", limit: "1" })
  .reply(200, "[]");

describe("index", () => {
  it("should handle non-paginated requests", () => {
    return fetchPaginate("http://api.example.com/one").then(({ data }) => {
      expect(data).toEqual("one");
    });
  });

  it("should return res for non-paginated requests", () => {
    return fetchPaginate("http://api.example.com/one").then(({ res }) => {
      expect(res).toBeDefined();
    });
  });

  describe("Link header", () => {
    it("should return last res when paginated", () => {
      return fetchPaginate(linkedUrl).then(({ res }) => {
        expect(res).toBeDefined();
        expect(res.headers.get('link')).toEqual('<http://api.example.com/linked?page=3>; rel="last"')
      });
    });

    it("should paginate", () => {
      return fetchPaginate(linkedUrl).then(({ data }) => {
        expect(data).toEqual(["one", "two", "three"]);
      });
    });

    it("should paginate until told not to", () => {
      const until = ({ pages }) => pages && pages.length === 2;
      return fetchPaginate(linkedUrl, { until }).then(({ data }) => {
        expect(data).toEqual(["one", "two"]);
      });
    });

    it("should paginate until promise told not to", () => {
      const until = ({ pages }) =>
        new Promise(resolve => {
          setTimeout(() => resolve(pages.length === 2), 100);
        });
      return fetchPaginate(linkedUrl, { until }).then(({ data }) => {
        expect(data).toEqual(["one", "two"]);
      });
    });

    it("should paginate until async told not to", () => {
      const until = async ({ pages }) => pages.length === 2;
      return fetchPaginate(linkedUrl, { until }).then(({ data }) => {
        expect(data).toEqual(["one", "two"]);
      });
    });
  });

  describe("params - page", () => {
    it("should paginate", () => {
      return fetchPaginate(pagedUrl, { params: true }).then(({ data }) => {
        expect(data).toEqual(["one", "two", "three"]);
      });
    });

    it("should paginate from page 2", () => {
      return fetchPaginate(pagedUrl, { params: true, page: 2 }).then(
        ({ data }) => {
          expect(data).toEqual(["two", "three"]);
        }
      );
    });

    it("should paginate until empty end", () => {
      return fetchPaginate(pagedEmptyEndUrl, { params: true }).then(
        ({ data }) => {
          expect(data).toEqual(["one", "two", "three"]);
        }
      );
    });
  });

  describe("params - offset", () => {
    it("should paginate with inferred limit", () => {
      return fetchPaginate(offsetUrl, { params: { offset: true } }).then(
        ({ data }) => {
          expect(data).toEqual(["one", "two", "three"]);
        }
      );
    });

    it("should paginate with specified limit", () => {
      return fetchPaginate(offsetLimitUrl, {
        params: { offset: true },
        limit: 1
      }).then(({ data }) => {
        expect(data).toEqual(["one", "two", "three"]);
      });
    });

    it("should paginate until empty end", () => {
      return fetchPaginate(offsetEmptyEndUrl, {
        params: { offset: true }
      }).then(({ data }) => {
        expect(data).toEqual(["one", "two", "three"]);
      });
    });
  });
});

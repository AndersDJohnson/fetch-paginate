import "isomorphic-fetch";
import fetchPaginate, { FetchPaginateUntilOptions } from "..";
import { base } from './nocks';

const linkedUrl = `${base}/linked`;
const pagedUrl = `${base}/paged`;
const pagedEmptyEndUrl = `${base}/paged-empty-end`;
const offsetUrl = `${base}/offset`;
const offsetLimitUrl = `${base}/offset-limit`;
const offsetEmptyEndUrl = `${base}/offset-empty-end`;

describe("index", () => {
  it("should handle non-paginated requests", async () => {
    const { data } = await fetchPaginate("http://api.example.com/one")
      expect(data).toEqual("one");
  });

  it("should return res for non-paginated requests", async () => {
    const { res } = await fetchPaginate("http://api.example.com/one")
    expect(res).toBeDefined();
  });

  describe("Link header", () => {
    it("should return last res when paginated", async () => {
      const { res } = await fetchPaginate(linkedUrl)
        expect(res).toBeDefined();
        expect(res!.headers.get('link')).toEqual('<http://api.example.com/linked?page=3>; rel="last"')
    });

    it("should paginate", async () => {
      const { data } = await fetchPaginate(linkedUrl)
        expect(data).toEqual(["one", "two", "three"]);
    });

    it("should paginate until told not to", async () => {
      const until = ({ pages }: FetchPaginateUntilOptions<any>) => pages && pages.length === 2;
      const { data } = await fetchPaginate(linkedUrl, { until })
      expect(data).toEqual(["one", "two"]);
    });

    it("should paginate until promise told not to", async () => {
      const until = ({ pages }: FetchPaginateUntilOptions<any>) =>
        new Promise<boolean>(resolve => {
          setTimeout(() => resolve(pages.length === 2), 100);
        });
      const { data } = await fetchPaginate(linkedUrl, { until })
      expect(data).toEqual(["one", "two"]);
    });

    it("should paginate until async told not to", async () => {
      const until = async ({ pages }: FetchPaginateUntilOptions<any>) => pages.length === 2;
      const { data } = await fetchPaginate(linkedUrl, { until })
      expect(data).toEqual(["one", "two"]);
    });
  });

  describe("params - page", () => {
    it("should paginate", async () => {
      const { data } = await fetchPaginate(pagedUrl, { params: true });
      expect(data).toEqual(["one", "two", "three"]);
    });

    it("should paginate from page 2", async () => {
      const { data } = await fetchPaginate(pagedUrl, { params: true, page: 2 })
      expect(data).toEqual(["two", "three"]);
    });

    it("should paginate until empty end", async () => {
      const { data } = await fetchPaginate(pagedEmptyEndUrl, { params: true })
      expect(data).toEqual(["one", "two", "three"]);
    });
  });

  describe("params - offset", () => {
    it("should paginate with inferred limit", async () => {
      const { data } = await fetchPaginate(offsetUrl, { params: { offset: true } })
      expect(data).toEqual(["one", "two", "three"]);
    });

    it("should paginate with specified limit", async () => {
      const { data } = await fetchPaginate(offsetLimitUrl, {
        params: { offset: true },
        limit: 1
      })
      expect(data).toEqual(["one", "two", "three"]);
    });

    it("should paginate until empty end", async () => {
      const { data } = await fetchPaginate(offsetEmptyEndUrl, {
        params: { offset: true }
      })
      expect(data).toEqual(["one", "two", "three"]);
    });
  });
});

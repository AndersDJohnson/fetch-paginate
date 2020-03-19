import "isomorphic-fetch";
import fetchPaginate, { FetchPaginateUntilOptions } from "..";
import { base } from './nocks';

const linkedUrl = `${base}/linked`;
const pagedUrl = `${base}/paged`;
const pagedEmptyEndUrl = `${base}/paged-empty-end`;
const offsetUrl = `${base}/offset`;
const offsetLimitUrl = `${base}/offset-limit`;
const offsetEmptyEndUrl = `${base}/offset-empty-end`;

const fetchPaginateWrapper = (url: string, opts?: any) => fetchPaginate(url, {
  items: (data: { list: string[] }) => data.list,
  ...opts,
});

describe("index", () => {
  it("should handle non-paginated requests", async () => {
    const { data } = await fetchPaginateWrapper("http://api.example.com/one")
      expect(data).toEqual(['one']);
  });

  it("should return res for non-paginated requests", async () => {
    const { res } = await fetchPaginateWrapper("http://api.example.com/one")
    expect(res).toBeDefined();
  });

  describe("Link header", () => {
    it("should return last res when paginated", async () => {
      const { res } = await fetchPaginateWrapper(linkedUrl)
        expect(res).toBeDefined();
        expect(res!.headers.get('link')).toEqual('<http://api.example.com/linked?page=3>; rel="last"')
    });

    it("should paginate", async () => {
      const { data } = await fetchPaginateWrapper(linkedUrl)
        expect(data).toEqual(["one", "two", "three"]);
    });

    it("should paginate until told not to", async () => {
      const until = ({ pages }: FetchPaginateUntilOptions<any>) => pages && pages.length === 2;
      const { data } = await fetchPaginateWrapper(linkedUrl, { until })
      expect(data).toEqual(["one", "two"]);
    });

    it("should paginate until promise told not to", async () => {
      const until = ({ pages }: FetchPaginateUntilOptions<any>) =>
        new Promise<boolean>(resolve => {
          setTimeout(() => resolve(pages.length === 2), 100);
        });
      const { data } = await fetchPaginateWrapper(linkedUrl, { until })
      expect(data).toEqual(["one", "two"]);
    });

    it("should paginate until async told not to", async () => {
      const until = async ({ pages }: FetchPaginateUntilOptions<any>) => pages.length === 2;
      const { data } = await fetchPaginateWrapper(linkedUrl, { until })
      expect(data).toEqual(["one", "two"]);
    });
  });

  describe("params - page", () => {
    it("should paginate", async () => {
      const { data } = await fetchPaginateWrapper(pagedUrl, { params: true });
      expect(data).toEqual(["one", "two", "three"]);
    });

    it("should paginate from page 2", async () => {
      const { data } = await fetchPaginateWrapper(pagedUrl, { params: true, page: 2 })
      expect(data).toEqual(["two", "three"]);
    });

    it("should paginate until empty end", async () => {
      const { data } = await fetchPaginateWrapper(pagedEmptyEndUrl, { params: true })
      expect(data).toEqual(["one", "two", "three"]);
    });
  });

  describe("params - offset", () => {
    it("should paginate with inferred limit", async () => {
      const { data } = await fetchPaginateWrapper(offsetUrl, { params: { offset: true } })
      expect(data).toEqual(["one", "two", "three"]);
    });

    it("should paginate with specified limit", async () => {
      const { data } = await fetchPaginateWrapper(offsetLimitUrl, {
        params: { offset: true },
        limit: 1
      })
      expect(data).toEqual(["one", "two", "three"]);
    });

    it("should paginate until empty end", async () => {
      const { data } = await fetchPaginateWrapper(offsetEmptyEndUrl, {
        params: { offset: true }
      })
      expect(data).toEqual(["one", "two", "three"]);
    });
  });
});

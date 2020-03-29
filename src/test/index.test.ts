import "isomorphic-fetch";
import fetchPaginate, { FetchPaginateUntilOptions } from "..";
import { base } from "./nocks";

const linkedUrl = `${base}/linked`;
const pagedUrl = `${base}/paged`;
const pagedEmptyEndUrl = `${base}/paged-empty-end`;
const offsetUrl = `${base}/offset`;
const offsetLimitUrl = `${base}/offset-limit`;
const offsetEmptyEndUrl = `${base}/offset-empty-end`;

const fetchPaginateWrapper = (url: string, opts?: any) =>
  fetchPaginate(url, {
    getItems: (data: { list?: string[] }) => data.list,
    ...opts,
  });

describe("index", () => {
  it("should handle non-paginated requests", async () => {
    const { items } = await fetchPaginateWrapper("http://api.example.com/one");
    expect(items).toEqual(["one"]);
  });

  it("should return responses for non-paginated requests", async () => {
    const { responses } = await fetchPaginateWrapper(
      "http://api.example.com/one"
    );
    expect(responses[0]).toMatchObject({ ok: true });
  });

  describe("Link header", () => {
    it("should return responses when paginated", async () => {
      const { responses } = await fetchPaginateWrapper(linkedUrl);
      expect(responses[responses.length - 1]).toBeDefined();
      expect(responses[responses.length - 1].headers.get("link")).toEqual(
        '<http://api.example.com/linked?page=3>; rel="last"'
      );
    });

    it("should return all pages when paginated", async () => {
      const { pages, responses } = await fetchPaginateWrapper(linkedUrl);
      expect(responses).toMatchObject([
        { ok: true },
        { ok: true },
        { ok: true },
      ]);
      expect(pages).toEqual([
        {
          list: ["one"],
        },
        {
          list: ["two"],
        },
        {
          list: ["three"],
        },
      ]);
    });

    it("should paginate", async () => {
      const { items } = await fetchPaginateWrapper(linkedUrl);
      expect(items).toEqual(["one", "two", "three"]);
    });

    it("should paginate until told not to", async () => {
      const until = ({ pages }: FetchPaginateUntilOptions<any, string>) =>
        pages && pages.length === 2;
      const { items } = await fetchPaginateWrapper(linkedUrl, { until });
      expect(items).toEqual(["one", "two"]);
    });

    it("should paginate until promise told not to", async () => {
      const until = ({ pages }: FetchPaginateUntilOptions<any, string>) =>
        new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(pages.length === 2), 100);
        });
      const { items } = await fetchPaginateWrapper(linkedUrl, { until });
      expect(items).toEqual(["one", "two"]);
    });

    it("should paginate until async told not to", async () => {
      const until = async ({ pages }: FetchPaginateUntilOptions<any, string>) =>
        pages.length === 2;
      const { items } = await fetchPaginateWrapper(linkedUrl, { until });
      expect(items).toEqual(["one", "two"]);
    });
  });

  describe("params - page", () => {
    it("should paginate", async () => {
      const { items } = await fetchPaginateWrapper(pagedUrl, { params: true });
      expect(items).toEqual(["one", "two", "three"]);
    });

    it("should paginate from page 2", async () => {
      const { items } = await fetchPaginateWrapper(pagedUrl, {
        params: true,
        page: 2,
      });
      expect(items).toEqual(["two", "three"]);
    });

    it("should paginate until empty end", async () => {
      const { items } = await fetchPaginateWrapper(pagedEmptyEndUrl, {
        params: true,
      });
      expect(items).toEqual(["one", "two", "three"]);
    });
  });

  describe("params - offset", () => {
    it("should paginate with inferred limit", async () => {
      const { items } = await fetchPaginateWrapper(offsetUrl, {
        params: { offset: true },
      });
      expect(items).toEqual(["one", "two", "three"]);
    });

    it("should paginate with specified limit", async () => {
      const { items } = await fetchPaginateWrapper(offsetLimitUrl, {
        params: { offset: true },
        limit: 1,
      });
      expect(items).toEqual(["one", "two", "three"]);
    });

    it("should paginate until empty end", async () => {
      const { items } = await fetchPaginateWrapper(offsetEmptyEndUrl, {
        params: { offset: true },
      });
      expect(items).toEqual(["one", "two", "three"]);
    });
  });
});

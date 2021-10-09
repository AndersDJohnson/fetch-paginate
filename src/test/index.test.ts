import "cross-fetch/polyfill";
import {
  fetchPaginate,
  fetchPaginateIterator,
  FetchPaginateUntilOptions,
} from "..";
import { base } from "./nocks";

const linkedUrl = `${base}/linked`;
const pagedUrl = `${base}/paged`;
const paged0Url = `${base}/paged-0`;
const pagedEmptyEndUrl = `${base}/paged-empty-end`;
const offsetUrl = `${base}/offset`;
const offsetLimitUrl = `${base}/offset-limit`;
const offsetEmptyEndUrl = `${base}/offset-empty-end`;

const getItems = (data: { list?: string[] }) => data.list;

type Item = string;

interface $Body {
  list: Item[];
}

const fetchPaginateMakeIteratorWrapper = (url: string, opts?: any) =>
  fetchPaginateIterator<$Body, Item>(url, {
    getItems,
    ...opts,
  });

const fetchPaginateWrapper = (url: string, opts?: any) =>
  fetchPaginate<$Body, Item>(url, {
    getItems,
    ...opts,
  });

describe("fetchPaginate", () => {
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

  it("should forward fetch options", async () => {
    const fetchOptions = { headers: { Test: "Yes" } };
    const { items } = await fetchPaginateWrapper("http://api.example.com/headers", {
      fetchOptions
    });
    expect(items).toEqual(["one"]);
  })

  it("should fail to match forwarded fetch options", async () => {
    const fetchOptions = { headers: { Test: "Nope" } };
    expect(fetchPaginateWrapper("http://api.example.com/headers", {
      fetchOptions
    })).rejects.toMatchObject({
      message: expect.stringMatching(/No match for request/),
    })
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

    it("should paginate from page 0", async () => {
      const { items } = await fetchPaginateWrapper(paged0Url, {
        params: true,
        page: 0,
      });
      expect(items).toEqual(["one", "two", "three"]);
    });

    it("should paginate from page 2", async () => {
      const { items } = await fetchPaginateWrapper(pagedUrl, {
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

  describe("getFetch", () => {
    it("should work", async () => {
      const body = '{"list":[{"foo":1}]}';
      const customFetch = jest.fn(async () => new Response(body));
      const getFetch = jest.fn(() => customFetch);
      const url = "http://api.example.com/one";
      const fetchOptions = { headers: { Test: "Yes" } };
      await fetchPaginateWrapper(url, { getFetch, fetchOptions });
      expect(getFetch).toHaveBeenCalledTimes(1);
      expect(getFetch).toHaveBeenCalledWith({
        url,
        fetchOptions,
        offset: 0,
        page: 1,
        prev: {
          items: [],
          offset: 0,
          page: 1,
          pageItems: [],
          pages: [{ list: [{ foo: 1 }] }],
          responses: [expect.anything()],
          url,
        },
      });
      expect(customFetch).toHaveBeenCalledTimes(1);
      expect(customFetch).toHaveBeenCalledWith(url, fetchOptions);
    });

    it("should resolve async", async () => {
      const body = '{"list":[{"foo":1}]}';
      const customFetch = jest.fn(async () => new Response(body));
      const getFetch = jest.fn(async () => customFetch);
      const url = "http://api.example.com/one";
      const fetchOptions = { headers: { Test: "Yes" } };
      await fetchPaginateWrapper(url, { getFetch, fetchOptions });
    });

    it("should fallback to fetch when not resolved", async () => {
      const getFetch = jest.fn(() => {});
      const url = "http://api.example.com/one";
      const fetchOptions = { headers: { Test: "Yes" } };
      const { items } = await fetchPaginateWrapper(url, {
        getFetch,
        fetchOptions,
      });
      expect(items).toEqual(["one"]);
    });

    it("should fallback to fetch when not resolved async", async () => {
      const getFetch = jest.fn(async () => {});
      const url = "http://api.example.com/one";
      const fetchOptions = { headers: { Test: "Yes" } };
      const { items } = await fetchPaginateWrapper(url, {
        getFetch,
        fetchOptions,
      });
      expect(items).toEqual(["one"]);
    });
  });

  describe("iterator", () => {
    it("should work", async () => {
      const allItems: string[][] = [];
      let mergedPageItems: string[] = [];
      const iterator = fetchPaginateMakeIteratorWrapper(linkedUrl);
      for await (const { items, pageItems } of iterator) {
        allItems.push(items);
        mergedPageItems = [...mergedPageItems, ...pageItems];
      }
      expect(mergedPageItems).toEqual(["one", "two", "three"]);
      expect(allItems).toEqual([
        ["one"],
        ["one", "two"],
        ["one", "two", "three"],
      ]);

      const result = iterator.getResult();

      expect(result.items).toEqual(["one", "two", "three"]);
    });
  });
});

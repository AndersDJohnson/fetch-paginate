import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import {
  fetchPaginate,
  fetchPaginateIterator,
  type FetchPaginateUntilOptions,
} from "../index.ts";
import { base } from "./nocks.ts";

const linkedUrl = `${base}/linked`;
const pagedUrl = `${base}/paged`;
const paged0Url = `${base}/paged-0`;
const pagedEmptyEndUrl = `${base}/paged-empty-end`;
const offsetUrl = `${base}/offset`;
const offsetLimitUrl = `${base}/offset-limit`;
const offsetEmptyEndUrl = `${base}/offset-empty-end`;

const getItems = (data: { list?: string[] }) => data.list ?? [];

type Item = string;

interface $Body {
  list: Item[];
  nextCursor?: string | null;
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
    assert.deepEqual(items, ["one"]);
  });

  it("should return responses for non-paginated requests", async () => {
    const { responses } = await fetchPaginateWrapper(
      "http://api.example.com/one"
    );
    assert.equal(responses[0].ok, true);
  });

  it("should forward fetch options", async () => {
    const fetchOptions = { headers: { Test: "Yes" } };
    const { items } = await fetchPaginateWrapper("http://api.example.com/headers", {
      fetchOptions
    });
    assert.deepEqual(items, ["one"]);
  })

  it("should fail to match forwarded fetch options", async () => {
    const fetchOptions = { headers: { Test: "Nope" } };
    await assert.rejects(
      fetchPaginateWrapper("http://api.example.com/headers", { fetchOptions }),
      { message: /No match for request/ }
    );
  });

  describe("Link header", () => {
    it("should return responses when paginated", async () => {
      const { responses } = await fetchPaginateWrapper(linkedUrl);
      assert.ok(responses[responses.length - 1]);
      assert.equal(
        responses[responses.length - 1].headers.get("link"),
        '<http://api.example.com/linked?page=3>; rel="last"'
      );
    });

    it("should return all pages when paginated", async () => {
      const { pages, responses } = await fetchPaginateWrapper(linkedUrl);
      assert.ok(responses.every((response) => response.ok));
      assert.deepEqual(pages, [
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
      assert.deepEqual(items, ["one", "two", "three"]);
    });

    it("should paginate until told not to", async () => {
      const until = ({ pages }: FetchPaginateUntilOptions<any, string>) =>
        pages && pages.length === 2;
      const { items } = await fetchPaginateWrapper(linkedUrl, { until });
      assert.deepEqual(items, ["one", "two"]);
    });

    it("should paginate until promise told not to", async () => {
      const until = ({ pages }: FetchPaginateUntilOptions<any, string>) =>
        new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(pages.length === 2), 100);
        });
      const { items } = await fetchPaginateWrapper(linkedUrl, { until });
      assert.deepEqual(items, ["one", "two"]);
    });

    it("should paginate until async told not to", async () => {
      const until = async ({ pages }: FetchPaginateUntilOptions<any, string>) =>
        pages.length === 2;
      const { items } = await fetchPaginateWrapper(linkedUrl, { until });
      assert.deepEqual(items, ["one", "two"]);
    });
  });

  describe("params - page", () => {
    it("should paginate", async () => {
      const { items } = await fetchPaginateWrapper(pagedUrl, { params: true });
      assert.deepEqual(items, ["one", "two", "three"]);
    });

    it("should paginate from page 0", async () => {
      const { items } = await fetchPaginateWrapper(paged0Url, {
        params: true,
        page: 0,
      });
      assert.deepEqual(items, ["one", "two", "three"]);
    });

    it("should paginate from page 2", async () => {
      const { items } = await fetchPaginateWrapper(pagedUrl, {
        page: 2,
      });
      assert.deepEqual(items, ["two", "three"]);
    });

    it("should paginate until empty end", async () => {
      const { items } = await fetchPaginateWrapper(pagedEmptyEndUrl, {
        params: true,
      });
      assert.deepEqual(items, ["one", "two", "three"]);
    });
  });

  describe("params - offset", () => {
    it("should paginate with inferred limit", async () => {
      const { items } = await fetchPaginateWrapper(offsetUrl, {
        params: { offset: true },
      });
      assert.deepEqual(items, ["one", "two", "three"]);
    });

    it("should paginate with specified limit", async () => {
      const { items } = await fetchPaginateWrapper(offsetLimitUrl, {
        limit: 1,
      });
      assert.deepEqual(items, ["one", "two", "three"]);
    });

    it("should paginate until empty end", async () => {
      const { items } = await fetchPaginateWrapper(offsetEmptyEndUrl, {
        params: { offset: true },
      });
      assert.deepEqual(items, ["one", "two", "three"]);
    });
  });

  describe("getFetch", () => {
    it("should work", async () => {
      const body = '{"list":[{"foo":1}]}';
      const customFetch = mock.fn(async () => new Response(body));
      const getFetch = mock.fn(() => customFetch);
      const url = "http://api.example.com/one";
      const fetchOptions = { headers: { Test: "Yes" } };
      await fetchPaginateWrapper(url, { getFetch, fetchOptions });
      assert.equal(getFetch.mock.calls.length, 1);
      const [getFetchArgs] = getFetch.mock.calls[0].arguments;
      assert.equal(getFetchArgs.url, url);
      assert.deepEqual(getFetchArgs.fetchOptions, fetchOptions);
      assert.equal(getFetchArgs.offset, 0);
      assert.equal(getFetchArgs.page, 1);
      assert.deepEqual(getFetchArgs.prev.items, []);
      assert.equal(getFetchArgs.prev.offset, 0);
      assert.equal(getFetchArgs.prev.page, 1);
      assert.deepEqual(getFetchArgs.prev.pageItems, []);
      assert.deepEqual(getFetchArgs.prev.pages, [{ list: [{ foo: 1 }] }]);
      assert.equal(getFetchArgs.prev.responses.length, 1);
      assert.ok(getFetchArgs.prev.responses[0] instanceof Response);
      assert.equal(getFetchArgs.prev.url, url);
      assert.equal(customFetch.mock.calls.length, 1);
      assert.deepEqual(customFetch.mock.calls[0].arguments, [url, fetchOptions]);
    });

    it("should resolve async", async () => {
      const body = '{"list":[{"foo":1}]}';
      const customFetch = mock.fn(async () => new Response(body));
      const getFetch = mock.fn(async () => customFetch);
      const url = "http://api.example.com/one";
      const fetchOptions = { headers: { Test: "Yes" } };
      await fetchPaginateWrapper(url, { getFetch, fetchOptions });
    });

    it("should fallback to fetch when not resolved", async () => {
      const getFetch = mock.fn(() => {});
      const url = "http://api.example.com/one";
      const fetchOptions = { headers: { Test: "Yes" } };
      const { items } = await fetchPaginateWrapper(url, {
        getFetch,
        fetchOptions,
      });
      assert.deepEqual(items, ["one"]);
    });

    it("should fallback to fetch when not resolved async", async () => {
      const getFetch = mock.fn(async () => {});
      const url = "http://api.example.com/one";
      const fetchOptions = { headers: { Test: "Yes" } };
      const { items } = await fetchPaginateWrapper(url, {
        getFetch,
        fetchOptions,
      });
      assert.deepEqual(items, ["one"]);
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
      assert.deepEqual(mergedPageItems, ["one", "two", "three"]);
      assert.deepEqual(allItems, [
        ["one"],
        ["one", "two"],
        ["one", "two", "three"],
      ]);

      const result = iterator.getResult();

      assert.deepEqual(result.items, ["one", "two", "three"]);
    });
  });

  it("should paginate with next URL from response body", async () => {
    const { items, pages } = await fetchPaginateWrapper(`${base}/hateoas`, {
      next: ({ url, body, isFirst }: any) => {
        if (isFirst) return { url };
        const href = body?._links?.next?.href;
        return href ? { url: new URL(href, url).toString() } : undefined;
      },
    });
    assert.equal(pages.length, 3);
    assert.deepEqual(items, ["one", "two", "three"]);
  });

  it("should paginate with next returning a url string", async () => {
    const { items } = await fetchPaginateWrapper(`${base}/hateoas`, {
      next: ({ body }: any) => body?._links?.next?.href,
    });
    assert.deepEqual(items, ["one", "two", "three"]);
  });

  it("should paginate with next as a body path", async () => {
    const { items } = await fetchPaginateWrapper(`${base}/hateoas`, {
      next: "_links.next.href",
    });
    assert.deepEqual(items, ["one", "two", "three"]);
  });

  it("should paginate with hateoas", async () => {
    const { items } = await fetchPaginateWrapper(`${base}/hateoas`, {
      hateoas: true,
    });
    assert.deepEqual(items, ["one", "two", "three"]);
  });

  it("should paginate with hateoas link name", async () => {
    const { items } = await fetchPaginateWrapper(`${base}/hateoas-links`, {
      hateoas: "more",
    });
    assert.deepEqual(items, ["one", "two"]);
  });

  it("should not stop on the first call when next finds no value", async () => {
    const calls: boolean[] = [];
    const { items } = await fetchPaginateWrapper(`${base}/hateoas`, {
      next: ({ body, isFirst }: any) => {
        calls.push(isFirst);
        return body?._links?.next?.href;
      },
    });
    assert.equal(calls[0], true);
    assert.deepEqual(items, ["one", "two", "three"]);
  });

  it("should stop when next path is missing", async () => {
    const { items } = await fetchPaginateWrapper(`${base}/hateoas`, {
      next: "_links.nope.href",
    });
    assert.deepEqual(items, ["one"]);
  });

  it("should paginate graphql with variables from previous page", async () => {
    const { items, pages } = await fetchPaginate<any, string>(
      `${base}/graphql`,
      {
        graphql: {
          query: "query q($page: Int) { products(page: $page) { list nextPage } }",
          variables: ({ page }) => {
            if (!page) return { type: "blog" };
            const nextPage = page.data?.products?.nextPage;
            return nextPage ? { type: "blog", page: nextPage } : undefined;
          },
        },
        getItems: (body) => body.data.products.list,
      }
    );
    assert.equal(pages.length, 3);
    assert.deepEqual(items, ["p1", "p2", "p3"]);
  });

  const productsQuery = `query Products($cursor: String) {
    products(first: 10, after: $cursor) {
      nodes { id name }
      pageInfo { endCursor hasNextPage }
    }
  }`;

  it("should paginate graphql with a cursor path", async () => {
    const { items, pages } = await fetchPaginate<any, string>(
      `${base}/graphql`,
      {
        graphql: {
          query: productsQuery,
          cursor: "data.products.pageInfo.endCursor",
        },
        getItems: (body) => body.data.products.list,
      }
    );
    assert.equal(pages.length, 3);
    assert.deepEqual(items, ["p1", "p2", "p3"]);
  });

  it("should use a string returned by graphql variables as the cursor", async () => {
    const { items, pages } = await fetchPaginate<any, string>(
      `${base}/graphql`,
      {
        graphql: {
          query: productsQuery,
          variables: ({ page }) =>
            page?.data?.products?.pageInfo?.endCursor,
        },
        getItems: (body) => body.data.products.list,
      }
    );
    assert.equal(pages.length, 3);
    assert.deepEqual(items, ["p1", "p2", "p3"]);
  });

  it("should paginate with a cursor query parameter using a response path", async () => {
    const { items } = await fetchPaginate<$Body, Item>(`${base}/cursor`, {
      getCursor: "nextCursor",
      getItems,
    });

    assert.deepEqual(items, ["one", "two", "three"]);
  });

  it("should paginate from a starting cursor", async () => {
    const { items } = await fetchPaginate<$Body, Item>(
      `${base}/cursor-start`,
      {
        cursor: "cursor-1",
        getCursor: "nextCursor",
        getItems,
      }
    );

    assert.deepEqual(items, ["two", "three"]);
  });

  it("should paginate from a numeric zero cursor", async () => {
    const { items } = await fetchPaginate<$Body, Item>(
      `${base}/cursor-start-zero`,
      {
        cursor: 0,
        getCursor: "nextCursor",
        getItems,
      }
    );

    assert.deepEqual(items, ["zero", "one"]);
  });

  it("should start GraphQL cursor pagination from a cursor", async () => {
    const { items } = await fetchPaginate<any, string>(`${base}/graphql`, {
      graphql: {
        query: productsQuery,
      },
      cursor: "cursor-1",
      getCursor: (body) => body.data.products.pageInfo.endCursor,
      getItems: (body) => body.data.products.list,
    });

    assert.deepEqual(items, ["p2", "p3"]);
  });

  it("should paginate with a custom cursor parameter using a function", async () => {
    const { items } = await fetchPaginate<$Body, Item>(
      `${base}/cursor-custom`,
      {
        params: { cursor: "after" },
        getCursor: (body) => body.nextCursor,
        getItems,
      }
    );

    assert.deepEqual(items, ["one", "two"]);
  });

  it("should follow a cursor after an empty page", async () => {
    const { items } = await fetchPaginate<$Body, Item>(
      `${base}/cursor-empty`,
      {
        params: { cursor: true },
        getCursor: "nextCursor",
        getItems,
      }
    );

    assert.deepEqual(items, ["two"]);
  });

  it("should use root getCursor for GraphQL cursor pagination", async () => {
    const { items } = await fetchPaginate<any, string>(`${base}/graphql`, {
      graphql: {
        query: productsQuery,
      },
      getCursor: (body) => body.data.products.pageInfo.endCursor,
      getItems: (body) => body.data.products.list,
    });

    assert.deepEqual(items, ["p1", "p2", "p3"]);
  });

  it("should accept a GraphQL query string directly", async () => {
    const { items } = await fetchPaginate<any, string>(`${base}/graphql`, {
      graphql: productsQuery,
      getCursor: (body) => body.data.products.pageInfo.endCursor,
      getItems: (body) => body.data.products.list,
    });

    assert.deepEqual(items, ["p1", "p2", "p3"]);
  });

  describe("graphql limit variable", () => {
    const limitQuery = `query Products($cursor: String, $limit: Int) {
      products(first: $limit, after: $cursor) {
        nodes { id name }
        pageInfo { endCursor hasNextPage }
      }
    }`;

    const recordBodies = () => {
      const bodies: any[] = [];
      const getFetch = () => (async (input: any, init?: any) => {
        bodies.push(JSON.parse(init.body));
        return fetch(input, init);
      }) as typeof fetch;
      return { bodies, getFetch };
    };

    it("should pass the limit option as a variable on every request", async () => {
      const { bodies, getFetch } = recordBodies();
      const { items } = await fetchPaginate<any, string>(`${base}/graphql`, {
        graphql: limitQuery,
        limit: 10,
        getCursor: (body) => body.data.products.pageInfo.endCursor,
        getItems: (body) => body.data.products.list,
        getFetch,
      });

      assert.deepEqual(items, ["p1", "p2", "p3"]);
      assert.equal(bodies.length, 3);
      bodies.forEach((body) => {
        assert.equal(body.query, limitQuery);
        assert.equal(body.variables.limit, 10);
      });
      assert.equal(bodies[0].variables.cursor, undefined);
      assert.equal(bodies[1].variables.cursor, "cursor-1");
      assert.equal(bodies[2].variables.cursor, "cursor-2");
    });

    it("should not inline the limit into the query", async () => {
      const { bodies, getFetch } = recordBodies();
      await fetchPaginate<any, string>(`${base}/graphql`, {
        graphql: limitQuery,
        limit: 10,
        getCursor: (body) => body.data.products.pageInfo.endCursor,
        getItems: (body) => body.data.products.list,
        getFetch,
      });

      assert.match(bodies[0].query, /first: \$limit/);
      assert.doesNotMatch(bodies[0].query, /first: 10/);
    });

    it("should let explicit graphql variables override the limit option", async () => {
      const { bodies, getFetch } = recordBodies();
      await fetchPaginate<any, string>(`${base}/graphql`, {
        graphql: {
          query: limitQuery,
          variables: ({ page }) => {
            const cursor = page?.data?.products?.pageInfo?.endCursor;
            if (page && !cursor) return undefined;
            return { limit: 5, ...(cursor ? { cursor } : {}) };
          },
        },
        limit: 10,
        getItems: (body) => body.data.products.list,
        getFetch,
      });

      assert.equal(bodies.length, 3);
      bodies.forEach((body) => assert.equal(body.variables.limit, 5));
    });

    it("should not send a limit variable on the first request when no limit option is set", async () => {
      const { bodies, getFetch } = recordBodies();
      await fetchPaginate<any, string>(`${base}/graphql`, {
        graphql: limitQuery,
        getCursor: (body) => body.data.products.pageInfo.endCursor,
        getItems: (body) => body.data.products.list,
        getFetch,
      });

      assert.equal(bodies[0].variables?.limit, undefined);
    });
  });
});

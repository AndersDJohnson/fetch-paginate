# fetch-paginate
> Get multiple pages of results from paginated APIs with `fetch`.

[:book: Read the docs!](https://andersdjohnson.github.io/fetch-paginate/)

Fetches multiple pages from paginated APIs with `fetch`
(using either `Link` headers like GitHub,
or with `page` or `offset` & `limit` query parameters).

Also use to search a paginated API until you find your item (see [Async Iterators](https://andersdjohnson.github.io/fetch-paginate/#async-iterators) or `until` option).

- Supports TypeScript.
- Isomorphic - works in Node and browser<sup>*</sup>
- Supports [custom `fetch`](https://andersdjohnson.github.io/fetch-paginate/#custom-fetch) wrappers for caching, etc.

## GraphQL

Pass a static `graphql.query` and a `graphql.variables(previous)` function, which receives the previous page's parsed body (`undefined` on the first call). Requests are sent as `POST`. Pagination stops when `variables` returns a falsy value, or the same variables as the previous call.

```ts
fetchPaginate("https://graphql.example.com", {
  graphql: {
    query,
    variables: (previous) => {
      if (!previous) return { type: "blog" };
      const nextPage = previous.data?.products?.nextPage;
      // return a falsy value to stop paginating
      return nextPage ? { type: "blog", page: nextPage } : undefined;
    },
  },
  getItems: (body) => body.data.products.items,
});
```

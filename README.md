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

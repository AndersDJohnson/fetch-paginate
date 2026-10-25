Fetches multiple pages from paginated APIs with `fetch`
(using either `Link` headers like GitHub,
or with customizable `page` or `offset` & `limit` query parameters, or with GraphQL).

Also use to search a paginated API until you find your item (see [Async Iterators](#async-iterators) or `until` option).

- Supports TypeScript.
- Isomorphic - works in Node and browser<sup>\*</sup>
- Supports [custom `fetch`](#custom-fetch) wrappers for caching, etc.

_\* For environments without global `fetch` support, a polyfill is required. Recommend `cross-fetch/polyfill`, otherwise `node-fetch` (Node.js) or `whatwg-fetch` (browser). With `node-fetch`, add it globally:_
```js
global.fetch = require('node-fetch');
```

## Usage

```js
import { fetchPaginate } from "fetch-paginate";

const { items } = await fetchPaginate("https://api.example.com/foo");
```

Now `items` will be an array of items across all pages (unless you define a custom `merge`).

If the API returns your results array nested in the response, use a custom `getItems` function to select them:

```js
const { items } = await fetchPaginate("https://api.example.com/foo", {
  getItems: (body) => body.results,
});
```

If you need access to all the page bodies or entire `response` objects, use:

```js
const { pages, responses } = await fetchPaginate("https://api.example.com/foo");
```

You can also specify the types of your objects with generics:

```ts
const { items, pages } = await fetchPaginate<MyBody, MyItem>(
  "https://api.example.com/foo"
);

// Now `items` has type `MyItem[]`,
// and `pages` has type `MyBody[]`.
```

```js
fetchPaginate(url, options);
```

---

To use query parameters instead of `Link` headers, use the `params` option:

```js
const { items } = await fetchPaginate("https://api.example.com/foo", {
  params: true, // Assumes `page` parameter, where the first page is `1`.
});
```

You can customize the name of the `page` parameter, e.g., to `pg`, like:

```js
const { items } = await fetchPaginate("https://api.example.com/foo", {
  params: {
    page: 'pg', // Assuming our API expects `?pg=2`, for example.
  },
});
```

If your API uses offset and/or limit parameters instead of page parameter, you can do:

```js
const { items } = await fetchPaginate("https://api.example.com/foo", {
  params: {
    offset: true,
  },
});
```

To customize the name of the offset and/or limit parameters, you can do:

```js
const { items } = await fetchPaginate("https://api.example.com/foo", {
  params: {
    offset: 'start',
    limit: 'count',
  },
});
```

For cursor-based APIs, use `getCursor` to select the next cursor from each response. The cursor is sent as a query parameter named `cursor` by default:

```js
const { items } = await fetchPaginate("https://api.example.com/foo", {
  getCursor: "nextCursor",
});
```

You can provide a function instead of a response-body path, and customize the query parameter name with `params.cursor`:

```js
const { items } = await fetchPaginate("https://api.example.com/foo", {
  params: { cursor: "after" },
  getCursor: (body) => body.pageInfo.endCursor,
});
```

### Custom Start or Limit

To start at a page other than the default first page, use the `page` option. For APIs whose pages start at `0`:

```js
const { items } = await fetchPaginate("https://api.example.com/foo", {
  params: true, // Assumes `page` parameter.
  page: 0,
});
```

To start at a later page:

```js
const { items } = await fetchPaginate("https://api.example.com/foo", {
  params: true, // Assumes `page` parameter.
  page: 3, // Start at page 3.
});
```

To start at a specific offset, set `offset`. You can also set `limit` to control the size of each page:

```js
const { items } = await fetchPaginate("https://api.example.com/foo", {
  params: {
    offset: true,
  },
  offset: 17, // Start at the 17th item.
  limit: 10, // Fetch 10 items per page.
});
```

For cursor-based APIs, set `cursor` to the starting cursor. Use `getCursor` to select the next cursor from each response:

```js
const { items } = await fetchPaginate("https://api.example.com/foo", {
  cursor: "cursor-from-previous-request",
  getCursor: "nextCursor",
});
```

### Async Iterators

If you want to serially process each page, you can use `fetchPaginateIterator`,
build on the [async iterators (`for await...of`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of) API.

This also means you can use `break` and `continue` semantics - perhaps as an alterative to the `until` option.

```js
import { fetchPaginateIterator } from "fetch-paginate";

const myIterator = fetchPaginateIterator("https://api.example.com/foo");

for await (const { pageItems } of myIterator) {
  console.log(pageItems);
}
```

For example, if you want to stop after finding a certain item:

```ts
let foundItem;
for await (const { pageItems } of myIterator) {
  foundItem = pageItems.find((item) => item.title.match(/Something/));
  if (foundItem) break;
}
console.log(foundItem);
```

You can also get each page body or entire `response` object:

```js
for await (const { page, response } of myIterator) {
  console.log(page, response);
}
```

And also get the final result which has the same shape as `fetchPaginate` (`{ items, pages, responses }`):

```js
for await (const { pageItems } of myIterator) {
  console.log(pageItems);
}

myIterator.getResult();
```

The iterator similarly supports TypeScript generics:

```ts
const myIterator = await fetchPaginateIterator<MyBody, MyItem>(
  "https://api.example.com/foo"
);
```

### Custom Fetch

If you want custom fetching behavior like caching,
you can provide a factory for a custom `fetch`-compatible function.
If you return `undefined`, it'll fall back to global `fetch`:

```js
await fetchPaginate("https://api.example.com/foo", {
  getFetch: ({ url, offset, page, fetchOptions, ...etc }) => async () => {
    const cached = await cache.get(url);
    if (cached) return new Response(cached.body, cached.init);
  },
});
```

Or you can resolve that `fetch`-like function asynchronously:

```js
await fetchPaginate("https://api.example.com/foo", {
  getFetch: async ({ url }) => {
    const cached = await cache.get(url);
    if (cached) return async () => new Response(cached.body, cached.init);
  },
});
```

### Browser

For bundled/browser use `fetch-paginate/bundle` (which includes dependencies, except `fetch`):

```js
import "cross-fetch/polyfill";
import fetchPaginate from "fetch-paginate/bundle";
```

or even with the UMD global (on `window`):

```js
import "cross-fetch/polyfill";
import "fetch-paginate/bundle";

const { items } = await fetchPaginate("https://api.example.com/foo");
```

### GraphQL

For GraphQL APIs that use cursor pagination, declare and use a `$cursor` variable in the query. See [GraphQL cursor pagination](https://graphql.org/learn/pagination/) for more about the concept.

```graphql
query Products($cursor: String) {
  products(first: 10, after: $cursor) {
    nodes { id name }
    pageInfo { endCursor hasNextPage }
  }
}
```

Pass the query directly as a string in `graphql`, or use the `query` property when configuring GraphQL options such as `variables` or `operationName`. Use the root-level `getCursor` option to specify a dot-separated path or a function that gets the next cursor from the previous page's parsed response body. The first request has no cursor value:

```js
const { items } = await fetchPaginate("https://graphql.example.com", {
  graphql: query,
  getCursor: "data.products.pageInfo.endCursor",
  getItems: (body) => body.data.products.nodes,
});
```

The GraphQL `cursor` option remains supported for compatibility, but `getCursor` is preferred. Alternatively, return a string from `variables` to use it as the cursor value (`{ cursor: returnedString }`). As before, return an object to provide other GraphQL variables, or a falsy value to stop paginating after the first call:

```js
const { items } = await fetchPaginate("https://graphql.example.com", {
  graphql: {
    query,
    variables: ({ page }) =>
      page?.data?.products?.pageInfo?.endCursor,
  },
  getItems: (body) => body.data.products.nodes,
});
```

If `getCursor` (or the deprecated GraphQL `cursor`) and `variables` are both provided, an object returned by `variables` is merged with the extracted cursor, which takes precedence. A string returned by `variables` is ignored in favor of the extracted cursor.

## Options

### `getItems`

An optional function specifying how to get items list from a page of response body.

Defaults to identity:

```js
(body) => body;
```

### `merge`

An optional function specifying how to merge pages of items.
Receives an array of arrays of items from each page (from `getItems(await parse(response))` for each page).

Defaults to flatten arrays:

```js
(setOfSetsOfItems) => setOfSetsOfItems.reduce((acc, v) => [...acc, ...v], []);
```

### `parse`

An optional function specifying how to parse responses. Return a promise.

Defaults to parse JSON:

```js
(response) =>
  response.ok && response.status !== 204 ? response.json() : response.text();
```

### `until`

An optional function specifying when to stop paginating. Receives parsed body and whole response object. Return `true` to stop paginating, or a promise that resolves as such.

Defaults to always return `false` - to continue to consume until all pages:

```js
({ page, pages, response, responses, items, pageItems }) => false;
```

### `next`

`string | (args: { url, response, body, pageItems, page, limit, offset, params, isFirst }) => string | { url?, page?, limit?, offset? } | void`

Determines the next request. Either:

- a **function**, called before each request (with `isFirst: true` before the first). Return the next URL as a string, or an object with the next `url` (or `page`, `limit`, `offset`), or a falsy value to stop paginating. If it returns a falsy value on the first call, the original `url` is requested. `body` is the parsed body of the previous page (`undefined` on the first call).
- a **string**, a dot-separated path (e.g. `"_links.next.href"`) to the next URL in the previous page's parsed body. 

Missing values stop pagination, except before the first request, where there is no previous page yet and the original `url` is requested.

Returned URL strings may be relative; they are resolved against the previous request URL.

Defaults to using `params`, or else the `Link` header's `rel="next"`.

For example, to follow a next link in the response body, as in HATEOAS APIs:

```js
fetchPaginate("https://api.example.com/orders", {
  next: ({ body }) => body?._links?.next?.href,
});

// or equivalently
fetchPaginate("https://api.example.com/orders", {
  next: "_links.next.href",
});
```

### `hateoas`

`boolean | string`

Shorthand: when `true` and `next` is not set, `next` defaults to `"_links.next.href"`. Pass a string to use a different link name under `_links`, e.g. `"more"` for `"_links.more.href"`.

```js
fetchPaginate("https://api.example.com/orders", { hateoas: true });
fetchPaginate("https://api.example.com/orders", { hateoas: "more" });
```

### `params`

`boolean | ParamsObject`

Optionally use these if the API paginates with query parameters (`page`, `limit` and `offset`, or `cursor`), rather than `Link` headers.

If you pass `params: true`, it will use `page` as the default, instead of `limit` and `offset`.

### `params.page`

`string`

The name of the query parameter to use for pages.

Defaults to `"page"`.

### `params.limit`

`string | boolean`

The name of the query parameter to use for limit per page.

If `limit: true`, it will indicate to use `limit` and `offset` instead of `page`, but use default names.

Defaults to `"limit"`.

### `params.offset`

`string | boolean`

The name of the query parameter to use for page offset.

If `offset: true`, it will indicate to use `limit` and `offset` instead of `page`, but use default names.

Defaults to `"offset"`.

### `params.cursor`

`string | boolean`

The name of the query parameter to use for a cursor. Use `true` to use the default name, `"cursor"`. Cursor pagination requires a root-level `getCursor` option, which can enable cursor pagination by itself when no other pagination mode is selected.

### `getCursor`

`string | (body) => string | number | falsy`

Gets the cursor from a parsed response body, either with a dot-separated path or a function. The returned cursor is used for the next request's query parameter (default `"cursor"`) or, for GraphQL, as the `cursor` variable. Pagination stops when the value is falsy. The root-level option takes precedence over `graphql.cursor`.

### `page`

`number`

If using `params` with `page`, this indicates the page at which to start fetching. Defaults to `1`.

### `offset`

`number`

If using `params` with `offset` and `limit`, this indicates the offset at which to start fetching. Defaults to `0`.

### `limit`

`number`

If using `params` with `offset` and `limit`, this indicates the size of each page. Defaults to the size of the first page fetched.

### `cursor`

`string | number`

The cursor to use for the first request when using cursor pagination. For query parameter pagination, it uses the parameter selected by `params.cursor` (default `"cursor"`). For GraphQL, it is sent as the first request's `cursor` variable when `getCursor` or `graphql.cursor` is configured.

### `fetchOptions`

`ResponseInit` (`Object`)

Additional options to pass to `fetch`.

### `getFetch`

`(args: FetchPaginateGetFetchArgs) => ( typeof fetch | Promise<typeof fetch> )`

A factory that provides a `fetch`-compatible function.
Use this, e.g., to define your own custom cache wrapper.

### `graphql`

`string | { query: string, operationName?: string, cursor?: string, variables?: ({ page }) => string | Object | falsy }`

Paginate a GraphQL API (see [GraphQL](#graphql)).
Pass the query directly as a string, or use an object to provide additional GraphQL options.
Requests are sent as `POST` with a JSON body of `{ query, operationName, variables }`, and `fetchOptions.headers` are merged over the default `Content-Type: application/json`.
The `next`, `params`, `page`, `limit` and `offset` options are not used.
`cursor` is a deprecated dot-separated path into the previous page's parsed response body; use root-level `getCursor` instead. A string returned by `variables` is sent as the `cursor` variable. An object is sent as the variables object, unless `cursor` or `getCursor` is also set, in which case it is merged with the extracted cursor and the extracted value wins. Pagination also stops when `variables` returns a falsy value after the first call, or when the variables are identical to the previous call.

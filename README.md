# fetch-paginate

[![npm](https://img.shields.io/npm/v/fetch-paginate.svg)](https://www.npmjs.com/package/fetch-paginate)

> Get multiple pages of results from paginated APIs with `fetch`.

[![npm install fetch-paginate (copy)](https://copyhaste.com/i?t=npm%20install%20fetch-paginate)](https://copyhaste.com/c?t=npm%20install%20fetch-paginate "npm install fetch-paginate (copy)")

or:

[![yarn add fetch-paginate (copy)](https://copyhaste.com/i?t=yarn%20add%20fetch-paginate)](https://copyhaste.com/c?t=yarn%20add%20fetch-paginate "yarn add fetch-paginate (copy)")

Fetches multiple pages from paginated APIs with `fetch`
(using either `Link` headers like GitHub,
or with `page` or `offset` & `limit` query parameters).

Also use to search a paginated API until you find your item (see [Async Iterators](#async-iterators) or `until` option).

- Supports TypeScript.
- Isomorphic - works in Node and browser (if used with `isomorphic-fetch`) \*

_\* Requires a `fetch` polyfill for environments that don't support that.
Recommended is `isomorphic-fetch` or `node-fetch` or `whatwg-fetch`._

## Usage

```js
import { fetchPaginate } from "fetch-paginate";

const { items } = await fetchPaginate("https://api.example.com/foo");
```

Now `items` will be an array of items across all pages (unless you define a custom `merge`).

If the the API returns your results in a nested response, use a custom `getItems` function to select them:

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

### Async Iterators

If you want to serially process each page, you can use `fetchPaginateIterator`,
build on the [async iterators (`for await...of`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of) API.

This also means you can use `break` and `continue` semantics - perhaps as an alterative to the `until` option.

```js
import { fetchPaginateIterator } from "fetch-paginate";

const myIterator = fetchPaginateIterator("https://api.example.com/foo", {
  getItems: (body) => body.results,
});

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

And also get the final result which has the same shape as `fetchPaginage` (`{ items, pages, responses }`):

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
you can provide a factory for a custom `fetch`-compatiable function.
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

````js
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
import "isomorphic-fetch";
import fetchPaginate from "fetch-paginate/bundle";
````

or even with the UMD global (on `window`):

```js
import "isomorphic-fetch";
import "fetch-paginate/bundle";

const { items } = await fetchPaginate("https://api.example.com/foo");
```

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

### `params`

`boolean | ParamsObject`

Optionally use these if the API paginates with query parameters (either `page`, or `limit` and `offset`), rather than `Link` headers.

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

### `page`

`number`

If using `params` with `page`, this indicates the page at which to start fetching.

Defaults to value of `firstPage`.

### `offset`

`number`

If using `params` with `offset` and `limit`, this indicates the offset at which to start fetching.

Defaults to value of `firstOffset`.

### `limit`

`number`

If using `params` with `offset` and `limit`, this indicates the size of each page.

Defaults to the size of the first page fetched.

### `firstPage`

`number`

The first page index.

Defaults to `1`.

### `firstOffset`

`number`

The first offset index.

Defaults to `0`.

### `fetchOptions`

`ResponseInit` (`Object`)

Additional options to pass to `fetch`.

### `getFetch`

`(args: FetchPaginateGetFetchArgs) => ( typeof fetch | Promise<typeof fetch> )`

A factory that provides a `fetch`-compatible function.
Use this, e.g., to define your own custom cache wrapper.

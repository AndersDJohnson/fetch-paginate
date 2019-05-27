# fetch-paginate

[![npm](https://img.shields.io/npm/v/fetch-paginate.svg)](https://www.npmjs.com/package/fetch-paginate)

Get multiple pages of results from paginated APIs with `fetch`,
using either `Link` headers like GitHub,
or with `page` or `offset` & `limit` query parameters.

Resolves with the merged `data` object.

Isomorphic - works in Node and browser - if used with `isomorphic-fetch`.

Requires a `fetch` polyfill for environments that don't support that.
Recommended is `isomorphic-fetch` or `node-fetch` or `whatwg-fetch`.

## Install

[![npm install fetch-paginate (copy)](https://copyhaste.com/i?t=npm%20install%20fetch-paginate)](https://copyhaste.com/c?t=npm%20install%20fetch-paginate "npm install fetch-paginate (copy)")

or:

[![yarn add fetch-paginate (copy)](https://copyhaste.com/i?t=yarn%20add%20fetch-paginate)](https://copyhaste.com/c?t=yarn%20add%20fetch-paginate "yarn add fetch-paginate (copy)")

## Example

```js
import "isomorphic-fetch";
import fetchPaginate from "fetch-paginate";

fetchPaginate("https://api.example.com/foo").then(({ res, data }) => {
  console.log({ res, data });
});
```

```js
fetchPaginate(url, options);
```

## Options

### `items`

An optional function specifying how to get items list from a page of response data.

Defaults to identity:

```js
data => data;
```

### `merge`

An optional function specifying how to merge pages of items.
Receives an array of arrays of items from each page (from `items(await parse(res))` for each page).

Defaults to flatten arrays:

```js
setOfSetsOfItems => setOfSetsOfItems.reduce((acc, v) => [...acc, ...v], []);
```

### `parse`

An optional function specifying how to parse responses. Return a promise.

Defaults to parse JSON:

```js
res => (res.ok && res.status !== 204 ? res.json() : res.text());
```

### `until`

An optional function specifying when to stop paginating. Receives parsed data and whole response object. Return `true` to stop paginating, or a promise that resolves as such.

Defaults to always return `false` - to continue to consume until all pages:

```js
({ page, pages }) => false;
```

### `params`

`Boolean | Object`

Optionally use these if the API paginates with query parameters (either `page`, or `limit` and `offset`), rather than `Link` headers.

If you pass `params: true`, it will use `page` as the default, instead of `limit` and `offset`.

### `params.page`

`String`

The name of the query parameter to use for pages.

Defaults to `"page"`.

### `params.limit`

`String`

The name of the query parameter to use for limit per page.

Defaults to `"limit"`.

### `params.offset`

`String | Boolean`

The name of the query parameter to use for page offset.

Defaults to `"offset"`.

### `firstPage`

`Number`

The first page index.

Defaults to `1`.

### `firstOffset`

`Number`

The first offset index.

Defaults to `0`.

### `page`

`Number`

If using `params` with `page`, this indicates the page at which to start fetching.

Defaults to value of `firstPage`.

### `offset`

`Number`

If using `params` with `offset` and `limit`, this indicates the offset at which to start fetching.

Defaults to value of `firstOffset`.

### `limit`

`Number`

If using `params` with `offset` and `limit`, this indicates the size of each page.

Defaults to the size of the first page fetched.

### `options`

`Object`

Additional options to pass to `fetch`.

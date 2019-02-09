# fetch-paginate

[![npm](https://img.shields.io/npm/v/fetch-paginate.svg)](https://www.npmjs.com/package/fetch-paginate)

Get multiple pages of results from a paginated API with the Link header via the Fetch API.

Resolves with the last response object as `res` and the merged `data` object.

Isomorphic - works in Node and browser - if used with `isomorphic-fetch`.

Requires a `fetch` polyfill for environments that don't support that.
Recommended is `isomorphic-fetch` or `node-fetch` or `whatwg-fetch`.

## Install

[![npm install fetch-paginate (copy)](https://copyhaste.com/i?t=npm%20install%20fetch-paginate)](https://copyhaste.com/c?t=npm%20install%20fetch-paginate 'npm install fetch-paginate (copy)')

or:

[![yarn add fetch-paginate (copy)](https://copyhaste.com/i?t=yarn%20add%20fetch-paginate)](https://copyhaste.com/c?t=yarn%20add%20fetch-paginate 'yarn add fetch-paginate (copy)')

## Example

```js
import 'isomorphic-fetch'
import fetchPaginate from 'fetch-paginate'

fetchPaginate('https://api.example.com/foo').then(({ res, data }) => {
  console.log({ res, data })
})
```

```js
fetchPaginate(url, (options = {}))
```

## Options

Supports all `fetch` options, plus:

### `paginate`

Whether to paginate at all (can disable per-request).

### `items`

An optional function specifying how to get items list from response data.

Defaults to identity:

```js
data => data
```

### `merge`

An optional function specifying how to merge a page of results with previous. Receives current results of `parse` below.

Defaults to concatenate arrays, assuming `items` option is correct:

```js
(page, data) => [...items(page), ...(data || [])]
```

### `parse`

An optional function specifying how to parse responses. Return a promise.

Defaults to parse JSON:

```js
res => (res.ok && res.status !== 204 ? res.json() : res.text())
```

### `until`

An optional function specifying when to stop paginating. Receives parsed data and whole response object. Return `true` to stop paginating, or a promise that resolves as such.

Defaults to always return `false` - to continue to consume until all pages:

```js
(data, res) => false
```

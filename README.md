# fetch-paginate

Get multiple pages of results from a paginated API with the Link header via the Fetch API.

Resolves with the last response object as `res` and the merged `data` object.

Isomorphic - works in Node and browser - if used with `isomorphic-fetch`.

Requires a `fetch` polyfill for environments that don't support that.
Recommended is `isomorphic-fetch` or `node-fetch` or `whatwg-fetch`.

## Example

```js
import 'isomorphic-fetch'
import fetchPaginate from 'fetch-paginate'

fetchPaginate('https://api.example.com/foo')
  .then(({ res, data }) => {
    console.log({ res, data })
  })
```

```js
fetchPaginate(url, options = {})
```

## Options

Supports all `fetch` options, plus:

### `items`

An optional function specifying how to get items list from response data.

Defaults to identity

```js
data => data
```

### `merge`

An optional function specifying how to merge a page of results with previous. Receives current results of `parse` below.

Defaults to concatenate arrays, assuming `items` option is correct:

```js
(acc, data) => [...acc, ...items(data)]
```

### `parse`

An optional function specifying how to parse responses. Return a promise.

Defaults to parse JSON:

```js
res => res.ok && res.status !== 204 ? res.json() : res.text()
```

### `until`

An optional function specifying when to stop paginating. Receives parsed data and whole response object. Return `true` to stop paginating.

Defaults to always return `false` - to continue to consume until all pages:

```js
(data, res) => false
```

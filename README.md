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
- Isomorphic - works in Node and browser<sup>\*</sup>
- Supports [custom `fetch`](#-custom-fetch) wrappers for caching, etc.

See docs at: https://andersdjohnson.com/code/fetch-paginate/

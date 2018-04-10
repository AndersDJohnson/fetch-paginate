import parseLinkHeader from 'parse-link-header'

const fetchPaginate = (url, options = {}) => {
  const {
    paginate = true,
    items = data => data,
    merge = (data, pageData) => ([...data, ...items(pageData)]),
    parse = res => res.ok ? res.json() : undefined,
    until = (data, res) => false,
    ...rest
  } = options

  return fetch(url, rest)
    .then(async res => {
      const data = await parse(res)

      if (paginate && !until(data, res)) {
        if (res.headers) {
          const link = res.headers.get('link') || res.headers.get('Link')

          if (link) {
            const { next } = parseLinkHeader(link) || {}

            if (next) {
              const { data: pageData } = await fetchPaginate(next.url, options)

              return {
                res,
                data: merge(data, pageData)
              }
            }
          }
        }
      }

      return {
        res,
        data
      }
    })
}

export default fetchPaginate

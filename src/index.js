import parseLinkHeader from 'parse-link-header'

const fetchPaginate = (url, options = {}, ongoingData) => {
  const {
    paginate = true,
    items = data => data,
    merge = (pageData, nextData) => [...items(pageData), ...(nextData || [])],
    parse = res => (res.ok && res.status !== 204 ? res.json() : res.text()),
    until,
    ...rest
  } = options

  return fetch(url, rest).then(async res => {
    const pageData = await parse(res)

    const nextOngoingData = merge(pageData, ongoingData)
    const untilOngoingData = Array.isArray(nextOngoingData)
      ? nextOngoingData.reverse()
      : untilOngoingData

    const untilResult = until && until(pageData, untilOngoingData, res)
    const isPromise = untilResult && untilResult.then
    const hitUntil = isPromise ? await untilResult : untilResult

    if (res.ok && paginate && !hitUntil) {
      if (res.headers) {
        const link = res.headers.get('link') || res.headers.get('Link')

        if (link) {
          const { next } = parseLinkHeader(link) || {}

          if (next) {
            const { data: nextData } = await fetchPaginate(
              next.url,
              options,
              nextOngoingData
            )

            const finalData = merge(pageData, nextData)

            return {
              res,
              data: finalData
            }
          }
        }
      }
    }

    return {
      res,
      data: items(pageData)
    }
  })
}

export default fetchPaginate

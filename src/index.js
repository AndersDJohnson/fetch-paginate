import parseLinkHeader from 'parse-link-header'

const defaultItems = data => data
const defaultMerge = ({ items }) => (pageData, nextData) => [...items(pageData), ...(nextData || [])]
const defaultParse = res => (res.ok && res.status !== 204 ? res.json() : res.text())

const getNextFromLinkHeader = res => {
  if (!res.headers) return

  const link = res.headers.get('link') || res.headers.get('Link')

  if (!link) return
  
  const { next } = parseLinkHeader(link) || {}

  if (!next) return

  return {
    url: next.url
  }
}

const getNextWithParams = async ({ params, pageData, url, page, limit, offset }) => {
  if (!params) return

  const parsedUrl = new URL(url)

  if (!pageData || !pageData.length) return

  if (params.offset) {
    const offsetParam = (params.offset === true ? undefined : params.offset) || 'offset'

    const nextLimit = limit || (pageData && pageData.length) || 10

    const nextOffset = offset + nextLimit

    parsedUrl.searchParams.set(params.limit || 'limit', nextLimit)
    parsedUrl.searchParams.set(offsetParam, nextOffset)

    return {
      url: parsedUrl.toString(),
      limit: nextLimit,
      offset: nextOffset
    }
  } else {
    const nextPage = page + 1

    parsedUrl.searchParams.set(params.page || 'page', nextPage)

    return {
      url: parsedUrl.toString(),
      page: nextPage
    }
  }
}

const defaultNext = ({ params }) => ({ url, options, res, pageData, page, limit, offset }) => {
  const nextFromLinkHeader = getNextFromLinkHeader(res)

  if (nextFromLinkHeader) return nextFromLinkHeader

  const nextWithParams = getNextWithParams(({ params, pageData, url, page, limit, offset }))

  if (nextWithParams) return nextWithParams
}

const fetchPaginate = async (url, options = {}, { ongoingData, calls = 0 } = {}) => {
  const {
    paginate = true,
    params,
    items = defaultItems,
    merge = defaultMerge({ items }),
    parse = defaultParse,
    next = defaultNext({ params, items, parse }),
    until,
    limit,
    firstOffset = 0,
    offset = firstOffset,
    firstPage = 1,
    page = firstPage,
    ...rest
  } = options

  const res = await fetch(url, rest)

  const pageData = await parse(res)

  const nextOngoingData = merge(pageData, ongoingData)
  const untilOngoingData = Array.isArray(nextOngoingData)
    ? nextOngoingData.reverse()
    : untilOngoingData

  const untilResult = until && until(pageData, untilOngoingData, res)
  const hitUntil = await untilResult

  if (res.ok && paginate && !hitUntil) {
    const nextMeta = await next({ url, options, res, pageData, limit, offset, page })

    if (nextMeta) {
      const { url: nextUrl, limit, offset, page } = nextMeta

      try {
        const { data: nextData } = await fetchPaginate(
          nextUrl,
          {
            ...options,
            limit,
            offset,
            page,
          },
          {
            ongoingData: nextOngoingData,
            calls: calls + 1
          }
        )

        const finalData = merge(pageData, nextData)

        return {
          res,
          data: finalData
        }
      } catch (error) {
        if (res.status === 404 && calls > 0) {
          return {
            res,
            data: pageData
          }
        }

        throw error
      }
    }
  }

  return {
    res,
    data: items(pageData)
  }
}

export default fetchPaginate

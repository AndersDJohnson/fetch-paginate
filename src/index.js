import parseLinkHeader from "parse-link-header";

const defaultItems = data => data;
const defaultMerge = setOfSetsOfItems =>
  setOfSetsOfItems.reduce((acc, v) => [...acc, ...v], []);
const defaultParse = res =>
  res.ok && res.status !== 204 ? res.json() : res.text();

const getNextFromLinkHeader = ({ res, url, isFirst }) => {
  if (isFirst)
    return {
      url
    };

  if (!res || !res.headers) return;

  const link = res.headers.get("link") || res.headers.get("Link");

  if (!link) return;

  const { next } = parseLinkHeader(link) || {};

  if (!next) return;

  return {
    url: next.url
  };
};

const getNextWithParams = ({
  params,
  pageItems,
  url,
  firstPage,
  firstOffset,
  page,
  limit,
  offset,
  isFirst
}) => {
  if (!params) return;

  const parsedUrl = new URL(url);

  if (!isFirst && (!pageItems || !pageItems.length)) return;

  if (params.offset || params.limit) {
    const nextLimit = limit || (pageItems && pageItems.length);

    const nextOffset = isFirst ? offset : offset + nextLimit;

    const offsetParam =
      (params.offset === true ? undefined : params.offset) || "offset";

    if (nextOffset !== firstOffset) {
      parsedUrl.searchParams.set(offsetParam, nextOffset);
    }

    if (nextLimit) {
      parsedUrl.searchParams.set(params.limit || "limit", nextLimit);
    }

    return {
      url: parsedUrl.toString(),
      limit: nextLimit,
      offset: nextOffset
    };
  } else {
    const nextPage = isFirst ? page : page + 1;

    if (nextPage !== firstPage) {
      parsedUrl.searchParams.set(params.page || "page", nextPage);
    }

    return {
      url: parsedUrl.toString(),
      page: nextPage
    };
  }
};

const defaultNext = ({
  url,
  res,
  pageItems,
  firstPage,
  firstOffset,
  page,
  limit,
  offset,
  params,
  isFirst
}) => {
  const nextWithParams = getNextWithParams({
    url,
    pageItems,
    page,
    firstPage,
    firstOffset,
    limit,
    offset,
    params,
    isFirst
  });

  if (nextWithParams) return nextWithParams;

  const nextFromLinkHeader = getNextFromLinkHeader({
    res,
    url,
    isFirst
  });

  if (nextFromLinkHeader) return nextFromLinkHeader;
};

const fetchPaginate = async (url, options = {}) => {
  const {
    params,
    items = defaultItems,
    merge = defaultMerge,
    parse = defaultParse,
    next = defaultNext,
    until,
    firstOffset = 0,
    firstPage = 1,
    options: fetchOptions
  } = options;

  let { limit, offset = firstOffset, page = firstPage } = options;

  let pages = [];
  let pageItems;

  let calls = 0;

  let pageBody;

  let res;
  let nextUrl = url;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const nextMeta = await next({
      url: nextUrl,
      res,
      pageItems,
      firstPage,
      firstOffset,
      limit,
      offset,
      page,
      params,
      isFirst: calls === 0
    });

    if (!nextMeta) break;

    nextUrl = nextMeta.url || url;
    limit = nextMeta.limit || limit;
    offset = nextMeta.offset || offset;
    page = nextMeta.page || page;

    try {
      res = await fetch(nextUrl, fetchOptions);

      calls++;
    } catch (error) {
      if (res && res.status === 404 && calls > 0) {
        break;
      }

      throw error;
    }

    // end of pages, hopefully
    if (res && res.status === 404 && calls > 0) {
      break;
    }

    if (res && res.status >= 400) {
      throw new Error(`failed page call ${calls}`);
    }

    pageBody = await parse(res);

    if (!pageBody) break;

    pages.push(pageBody);

    pageItems = items(pageBody);

    if (until && (await until({ page: pageBody, pages }))) break;
  }

  const data = calls > 1 ? merge(pages.map(page => items(page))) : pageBody;

  return {
    data
  };
};

export default fetchPaginate;

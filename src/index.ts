import parseLinkHeader from "parse-link-header";

interface ParamsObject {
  page?: string;
  limit?: boolean | string;
  offset?: boolean | string;
}

type Params = ParamsObject | boolean;

export interface FetchPaginateUntilOptions<$Body> {
  page?: $Body;
  pages: $Body[];
}

export interface FetchPaginateNextOptions<Item> {
  url: string;
  res?: Response;
  pageItems?: Item[];
  firstPage: number;
  firstOffset: number;
  page: number;
  limit?: number;
  offset: number;
  params?: Params;
  isFirst: boolean;
}

interface FetchPaginateNext {
  url?: string;
  limit?: number;
  offset?: number;
  page?: number;
}

export type FetchPaginateUntilFunction<$Body> = (untilOptions: FetchPaginateUntilOptions<$Body>) => Promise<boolean> | boolean;
export type FetchPaginateItemsFunction<$Body , Item> = (body: $Body) => Item[];
export type FetchPaginateMergeFunction<Item> = (setOfSetsOfItems: (Item[] | undefined)[]) => Item[];
export type FetchPaginateParseFunction<$Body> = (res: Response) => Promise<$Body> | $Body;
export type FetchPaginateNextFunction<Item> = (nextOptions: FetchPaginateNextOptions<Item>) => FetchPaginateNext;

export interface FetchPaginateOptions<$Body , Item> {
  options?: ResponseInit;
  until?: FetchPaginateUntilFunction<$Body>;
  items?: FetchPaginateItemsFunction<$Body, Item>;
  merge?: FetchPaginateMergeFunction<Item>;
  parse?: FetchPaginateParseFunction<$Body>;
  next?: FetchPaginateNextFunction<Item>;
  limit?: number;
  offset?: number;
  params?: Params;
  page?: number;
  firstOffset?: number;
  firstPage?: number;
}

// @ts-ignore
const defaultItems = <$Body , Item>(data: $Body ): Item[] | undefined => data;

const defaultMerge = <Item>(setOfSetsOfItems: (Item[] | undefined)[]): Item[] =>
  setOfSetsOfItems.reduce((acc: Item[], v?: Item[]) => [...acc, ...(v ?? [])], []);

const defaultParse = <$Body>(res: Response): Promise<$Body> =>
  res.ok && res.status !== 204 ? res.json() : res.text();

const getNextFromLinkHeader = ({ res, url, isFirst }: { res?: Response, url: string, isFirst: boolean }): { url: string } | void => {
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

const getNextWithParams = <Item>({
  params,
  pageItems,
  url,
  firstPage,
  firstOffset,
  page,
  limit,
  offset,
  isFirst
}: {
  params?: Params;
  pageItems?: Item[];
  url: string;
  firstPage: number;
  firstOffset: number;
  page: number;
  limit?: number;
  offset: number;
  isFirst: boolean;
}): FetchPaginateNext | void => {
  if (!params) return;

  const parsedUrl = new URL(url);

  if (!isFirst && (!pageItems || !pageItems.length)) return;

  if (typeof params !== 'boolean' && (params.offset || params.limit)) {
    const nextLimit = limit || (pageItems && pageItems.length);

    if (!nextLimit) return;

    const nextOffset = isFirst ? offset : offset + nextLimit;

    const limitParam =
      (params.limit === true ? undefined : params.limit) || "limit";

    const offsetParam =
      (params.offset === true ? undefined : params.offset) || "offset";

    if (nextOffset !== firstOffset) {
      parsedUrl.searchParams.set(offsetParam, nextOffset.toString());
    }

    if (nextLimit) {
      parsedUrl.searchParams.set(limitParam, nextLimit.toString());
    }

    return {
      url: parsedUrl.toString(),
      limit: nextLimit,
      offset: nextOffset
    };
  } else {
    const nextPage = isFirst ? page : page + 1;

    if (nextPage !== firstPage) {
      parsedUrl.searchParams.set(typeof params === 'boolean' && params ? 'page' : params.page || 'page', nextPage.toString());
    }

    return {
      url: parsedUrl.toString(),
      page: nextPage
    };
  }
};

const defaultNext = <Item>({
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
}: FetchPaginateNextOptions<Item>): FetchPaginateNext | void => {
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

const fetchPaginate = async <$Body , Item>($url: URL | string, options: FetchPaginateOptions<$Body, Item> = {}) => {
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

  const url = typeof $url === 'string' ? $url : $url.toString();

  let { limit, offset = firstOffset, page = firstPage } = options;

  let pages: $Body[] = [];
  let pageItems: Item[] | undefined;

  let calls = 0;

  let pageBody;

  let res;
  let nextUrl = url;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const nextMeta = await next<Item>({
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
      if (res && res.status === 404 && calls> 0) {
        break;
      }

      throw error;
    }

    // end of pages, hopefully
    if (res && res.status === 404 && calls> 0) {
      break;
    }

    if (res && res.status>= 400) {
      throw new Error(
        `failed page call ${calls}, status ${res.status} ${res.statusText}`
      );
    }

    pageBody = await parse(res);

    if (!pageBody) break;

    pages.push(pageBody);

    pageItems = items<$Body, Item>(pageBody)

    if (until && (await until({ page: pageBody, pages }))) break;
  }

  const data = calls> 1 ? merge(pages.map(page => items(page))) : pageItems;

  return {
    data,
    res
  };
};

export default fetchPaginate;

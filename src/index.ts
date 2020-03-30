import parseLinkHeader from "parse-link-header";

interface ParamsObject {
  page?: string;
  limit?: boolean | string;
  offset?: boolean | string;
}

type Params = ParamsObject | boolean;

export interface FetchPaginateUntilOptions<$Body, Item> {
  page?: $Body;
  response: Response;
  pages: $Body[];
  items: Item[];
  pageItems: Item[];
  responses: Response[];
}

export interface FetchPaginateNextOptions<Item> {
  url: string;
  response?: Response;
  pageItems: Item[];
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

export type FetchPaginateUntilFunction<$Body, Item> = (
  untilOptions: FetchPaginateUntilOptions<$Body, Item>
) => Promise<boolean> | boolean;
export type FetchPaginateItemsFunction<$Body, Item> = (body: $Body) => Item[];
export type FetchPaginateMergeFunction<Item> = (
  setOfSetsOfItems: (Item[] | undefined)[]
) => Item[];
export type FetchPaginateParseFunction<$Body> = (
  response: Response
) => Promise<$Body> | $Body;
export type FetchPaginateNextFunction<Item> = (
  nextOptions: FetchPaginateNextOptions<Item>
) => FetchPaginateNext;

export interface FetchPaginateIteratorValue<$Body, Item> {
  page?: $Body;
  pages: $Body[];
  response: Response;
  responses: Response[];
  pageItems: Item[];
  items: Item[];
}

export interface FetchPaginateGetFetchArgs<$Body, Item> {
  url: string;
  fetchOptions?: ResponseInit;
  offset?: number;
  limit?: number;
  page?: number;
  prev: {
    url: string;
    offset?: number;
    limit?: number;
    page?: number;
    items: Item[];
    pageItems: Item[];
    pageBody?: $Body;
    pages: $Body[];
    response: Response;
    responses: Response[];
  };
}

export interface FetchPaginateOptions<$Body, Item> {
  fetchOptions?: ResponseInit;
  until?: FetchPaginateUntilFunction<$Body, Item>;
  getItems?: FetchPaginateItemsFunction<$Body, Item>;
  merge?: FetchPaginateMergeFunction<Item>;
  parse?: FetchPaginateParseFunction<$Body>;
  next?: FetchPaginateNextFunction<Item>;
  limit?: number;
  offset?: number;
  params?: Params;
  page?: number;
  firstOffset?: number;
  firstPage?: number;
  getFetch?: (args: FetchPaginateGetFetchArgs<$Body, Item>) => typeof fetch;
}

// @ts-ignore
const defaultGetItems = <$Body, Item>(data: $Body): Item[] | undefined => data;

const defaultMerge = <Item>(setOfSetsOfItems: (Item[] | undefined)[]): Item[] =>
  setOfSetsOfItems.reduce(
    (acc: Item[], v?: Item[]) => [...acc, ...(v ?? [])],
    []
  );

const defaultParse = <$Body>(response: Response): Promise<$Body> =>
  response.ok && response.status !== 204 ? response.json() : response.text();

const getNextFromLinkHeader = ({
  response,
  url,
  isFirst,
}: {
  response?: Response;
  url: string;
  isFirst: boolean;
}): { url: string } | void => {
  if (isFirst)
    return {
      url,
    };

  if (!response || !response.headers) return;

  const link = response.headers.get("link") || response.headers.get("Link");

  if (!link) return;

  const { next } = parseLinkHeader(link) || {};

  if (!next) return;

  return {
    url: next.url,
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
  isFirst,
}: {
  params?: Params;
  pageItems: Item[];
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

  if (!isFirst && !pageItems?.length) return;

  if (typeof params !== "boolean" && (params.offset || params.limit)) {
    const nextLimit = limit ?? pageItems?.length;

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
      offset: nextOffset,
    };
  } else {
    const nextPage = isFirst ? page : page + 1;

    if (nextPage !== firstPage) {
      parsedUrl.searchParams.set(
        typeof params === "boolean" && params ? "page" : params.page || "page",
        nextPage.toString()
      );
    }

    return {
      url: parsedUrl.toString(),
      page: nextPage,
    };
  }
};

const defaultNext = <Item>({
  url,
  response,
  pageItems,
  firstPage,
  firstOffset,
  page,
  limit,
  offset,
  params,
  isFirst,
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
    isFirst,
  });

  if (nextWithParams) return nextWithParams;

  const nextFromLinkHeader = getNextFromLinkHeader({
    response,
    url,
    isFirst,
  });

  if (nextFromLinkHeader) return nextFromLinkHeader;
};

const fetchPaginateIterator = <$Body, Item>(
  $url: URL | string,
  options: FetchPaginateOptions<$Body, Item> = {}
) => {
  const {
    params,
    getItems = defaultGetItems,
    merge = defaultMerge,
    parse = defaultParse,
    next = defaultNext,
    until,
    firstOffset = 0,
    firstPage = 1,
    fetchOptions,
    getFetch = () => fetch,
  } = options;

  const url = typeof $url === "string" ? $url : $url.toString();

  let { limit, offset = firstOffset, page = firstPage } = options;

  let pages: $Body[] = [];
  let pageBody: $Body;
  let pageItems: Item[] = [];
  let items: Item[] = [];
  let responses: Response[] = [];
  let response: Response;

  let done: boolean = false;

  let count = 0;

  let nextUrl = url;

  return {
    getResult: () => ({
      items,
      pages,
      responses,
    }),
    // @ts-ignore
    [Symbol.asyncIterator]: () => ({
      async next() {
        const makeReturn = ({ done }: { done: boolean }) => {
          const value: FetchPaginateIteratorValue<$Body, Item> = {
            page: pageBody,
            pages,
            response,
            responses,
            pageItems,
            items,
          };

          return {
            done,
            value,
          };
        };

        const makeShortCircuit = () => makeReturn({ done: true });

        if (done) {
          return makeShortCircuit();
        }

        const prevUrl = nextUrl;

        const nextMeta = await next<Item>({
          url: nextUrl,
          response,
          pageItems,
          firstPage,
          firstOffset,
          limit,
          offset,
          page,
          params,
          isFirst: count === 0,
        });

        if (!nextMeta) {
          return makeShortCircuit();
        }

        const prevLimit = limit;
        const prevOffset = offset;
        const prevPage = page;

        nextUrl = nextMeta.url || url;
        limit = nextMeta.limit || limit;
        offset = nextMeta.offset || offset;
        page = nextMeta.page || page;

        try {
          const fetch_ = getFetch({
            url: nextUrl,
            fetchOptions,
            limit,
            offset,
            page,
            prev: {
              url: prevUrl,
              limit: prevLimit,
              offset: prevOffset,
              page: prevPage,
              pageBody,
              pageItems,
              response,
              items,
              pages,
              responses,
            },
          });

          response = await fetch_(nextUrl, fetchOptions);

          responses.push(response);

          count++;
        } catch (error) {
          if (response && response.status === 404 && count > 0) {
            return makeShortCircuit();
          }

          throw error;
        }

        // end of pages, hopefully
        if (response && response.status === 404 && count > 0) {
          return makeShortCircuit();
        }

        if (response && response.status >= 400) {
          throw new Error(
            `failed page call ${count}, status ${response.status} ${response.statusText}`
          );
        }

        pageBody = await parse(response);

        if (!pageBody) {
          return makeShortCircuit();
        }

        pages.push(pageBody);

        pageItems = getItems<$Body, Item>(pageBody) ?? [];

        items = merge(pages.map((page) => getItems(page)));

        done = until
          ? await until({
              page: pageBody,
              pages,
              response,
              responses,
              pageItems,
              items,
            })
          : false;

        return makeReturn({ done: false });
      },
    }),
  };
};

const fetchPaginate = async <$Body, Item>(
  $url: URL | string,
  options: FetchPaginateOptions<$Body, Item> = {}
) => {
  const iterator = fetchPaginateIterator($url, options);

  for await (const _next of iterator) {
    // just proceed
  }

  return iterator.getResult();
};

export { fetchPaginate, fetchPaginateIterator };

export default fetchPaginate;

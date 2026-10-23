import parseLinkHeader from "parse-link-header";

export interface FetchPaginateParamsObject {
  page?: boolean | string;
  limit?: boolean | string;
  offset?: boolean | string;
}

export type FetchPaginateParams = FetchPaginateParamsObject | boolean;

export interface FetchPaginateUntilOptions<$Body, Item> {
  page?: $Body;
  response: Response;
  pages: $Body[];
  items: Item[];
  pageItems: Item[];
  responses: Response[];
}

export interface FetchPaginateNextOptions<Item, $Body = any> {
  url: string;
  response?: Response;
  body?: $Body;
  pageItems: Item[];
  page: number;
  limit?: number;
  offset: number;
  params?: FetchPaginateParams;
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
export type FetchPaginateNextFunction<Item, $Body = any> = (
  nextOptions: FetchPaginateNextOptions<Item, $Body>
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

export interface FetchPaginateGraphQLOptions<$Body> {
  query: string;
  operationName?: string;
  cursor?: string;
  /**
   * Called before each request with `{ page }`, the previous page's parsed body
   * (`undefined` for the first request). Return the variables for the next call,
   * or a string to use as the `cursor` variable.
   * Pagination stops when a falsy value is returned after the first call,
   * or when the variables are identical to the previous call's.
   */
  variables?: (
    options: Pick<FetchPaginateUntilOptions<$Body, any>, "page">
  ) =>
    | string
    | Record<string, unknown>
    | null
    | undefined
    | false;
}

export interface FetchPaginateOptions<$Body, Item> {
  graphql?: FetchPaginateGraphQLOptions<$Body>;
  fetchOptions?: ResponseInit;
  until?: FetchPaginateUntilFunction<$Body, Item>;
  getItems?: FetchPaginateItemsFunction<$Body, Item>;
  merge?: FetchPaginateMergeFunction<Item>;
  parse?: FetchPaginateParseFunction<$Body>;
  next?: FetchPaginateNextFunction<Item, $Body>;
  limit?: number;
  offset?: number;
  params?: FetchPaginateParams;
  page?: number;
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
  response.ok && response.status !== 204 ? response.json() : (response.text() as Promise<$Body>);

const getPath = (value: unknown, path: string) =>
  path.split(".").reduce<unknown>((current, key) => {
    if (
      current === null ||
      typeof current !== "object" ||
      !Object.prototype.hasOwnProperty.call(current, key)
    ) {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, value);

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
  page,
  limit,
  offset,
  isFirst,
}: {
  params?: FetchPaginateParams;
  pageItems: Item[];
  url: string;
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

    parsedUrl.searchParams.set(offsetParam, nextOffset.toString());

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

    const defaultPageValue = "page";
    parsedUrl.searchParams.set(
      params === true || params.page === true
        ? defaultPageValue
        : params.page || defaultPageValue,
      nextPage.toString()
    );

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
    fetchOptions: baseFetchOptions,
    getFetch = () => fetch,
    graphql,
  } = options;

  let fetchOptions = baseFetchOptions;
  let prevVariablesJson: string | undefined;

  const actualParams: FetchPaginateParamsObject | undefined =
    params || options.page || options.limit || options.offset
      ? {
          ...(params === true ? {} : params),
        }
      : undefined;

  if (actualParams) {
    if (options.page) {
      actualParams.page = actualParams.page || true;
    } else if (options.limit || options.offset) {
      actualParams.limit = actualParams.limit || true;
      actualParams.offset = actualParams.offset || true;
    }
  }

  const url = typeof $url === "string" ? $url : $url.toString();

  let { limit, offset = 0, page = 1 } = options;

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

        let nextMeta: FetchPaginateNext | void;

        if (graphql) {
          const previousPage = count === 0 ? undefined : pageBody;
          const cursor =
            graphql.cursor !== undefined
              ? getPath(previousPage, graphql.cursor)
              : undefined;
          const variablesResult = graphql.variables
            ? graphql.variables({ page: previousPage })
            : undefined;

          if (count > 0 && graphql.variables && !variablesResult) {
            return makeShortCircuit();
          }

          if (count > 0 && graphql.cursor !== undefined && !cursor) {
            return makeShortCircuit();
          }

          const variables: Record<string, unknown> | undefined =
            graphql.cursor !== undefined
              ? {
                  ...(typeof variablesResult === "object" && variablesResult
                    ? variablesResult
                    : {}),
                  cursor,
                }
              : typeof variablesResult === "string"
              ? { cursor: variablesResult }
              : variablesResult || undefined;

          const variablesJson = JSON.stringify(variables ?? null);

          if (count > 0 && variablesJson === prevVariablesJson) {
            return makeShortCircuit();
          }

          prevVariablesJson = variablesJson;

          fetchOptions = {
            ...baseFetchOptions,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(baseFetchOptions?.headers as Record<string, string>),
            },
            body: JSON.stringify({
              query: graphql.query,
              operationName: graphql.operationName,
              variables: variables || undefined,
            }),
          } as ResponseInit;

          nextMeta = { url };
        } else {
          nextMeta = await next<Item>({
            url: nextUrl,
            response,
            body: count === 0 ? undefined : pageBody,
            pageItems,
            limit,
            offset,
            page,
            params: actualParams,
            isFirst: count === 0,
          });
        }

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
          const fetch_ =
            (await getFetch({
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
            })) ?? fetch;

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

        pageItems = getItems(pageBody) ?? [];

        items = merge(
          pages.map((page) => {
            const eachPageItems = getItems(page);

            if (!Array.isArray(eachPageItems)) {
              throw new Error(
                "`getItems` option applied to a page must yield an array"
              );
            }

            return eachPageItems;
          })
        );

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

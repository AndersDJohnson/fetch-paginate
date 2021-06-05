import "cross-fetch/polyfill";
import yargs from "yargs";
import { get } from "lodash";
import fetchPaginate, {
  FetchPaginateOptions,
  FetchPaginateParams,
  FetchPaginateParamsObject,
} from ".";

const program = yargs
  .usage("$0 <url>")
  .option("i", {
    alias: "items",
    type: "string",
  })
  .option("l", {
    alias: "limit",
  })
  .option("o", {
    alias: "offset",
  })
  .option("p", {
    alias: "page",
  })
  .option("params.page", {})
  .option("params.limit", {})
  .option("params.offset", {});

const argv = program.argv;

const url = argv._[0];

if (!url) {
  program.showHelp();
  process.exit(1);
}

const options: FetchPaginateOptions<any, any> = {};

if (argv.items) {
  options.getItems = (page) => get(page, argv.items as "string");
}

if (argv.params) {
  let params: FetchPaginateParams;

  if (argv.params === true) {
    params = true;
  } else {
    params = argv.params as FetchPaginateParamsObject;
  }

  options.params = params;
}

options.page = argv.page ? parseInt(argv.page as string, 10) : undefined;
options.limit = argv.limit ? parseInt(argv.limit as string, 10) : undefined;
options.offset = argv.offset ? parseInt(argv.offset as string, 10) : undefined;

(async () => {
  const res = await fetchPaginate(url, options);

  console.log(res.items);
})();

import nodeExternals from "webpack-node-externals";

export default [
  {
    mode: "production",
    entry: './src/index.ts',
    output: {
      path: process.cwd(),
      filename: "bundle.js",
      library: "fetchPaginate",
      libraryTarget: "umd"
    },
    module: {
      rules: [
        {
          test: /.ts$/,
          exclude: /node_modules/,
          use: ["babel-loader"]
        }
      ]
    }
  },
  {
    mode: "production",
    entry: './src/index.ts',
    externals: nodeExternals(),
    output: {
      libraryTarget: "commonjs2"
    },
    module: {
      rules: [
        {
          test: /.ts$/,
          exclude: /node_modules/,
          use: ["babel-loader"]
        }
      ]
    }
  }
];

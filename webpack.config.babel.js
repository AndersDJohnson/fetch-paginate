import nodeExternals from "webpack-node-externals";

export default [
  {
    mode: "production",
    output: {
      filename: "[name].bundle.js",
      libraryTarget: "umd"
    },
    module: {
      rules: [
        {
          test: /.js$/,
          exclude: /node_modules/,
          use: ["babel-loader"]
        }
      ]
    }
  },
  {
    mode: "production",
    externals: nodeExternals(),
    output: {
      libraryTarget: "commonjs2"
    },
    module: {
      rules: [
        {
          test: /.js$/,
          exclude: /node_modules/,
          use: ["babel-loader"]
        }
      ]
    }
  }
];

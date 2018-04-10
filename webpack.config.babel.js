import nodeExternals from 'webpack-node-externals'

export default {
  mode: 'production',
  target: 'node',
  externals: [nodeExternals()],
  output: {
    libraryTarget: "commonjs2"
  },
  module: {
    rules: [
      {
        test: /.js$/,
        exclude: /node_modules/,
        use: ['babel-loader']
      }
    ]
  },
}

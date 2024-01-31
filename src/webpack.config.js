/* eslint-env node */
/* eslint-disable require-unicode-regexp */
const path = require('path')
const HtmlWebPackPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')

const distPath = path.join(__dirname, '../dist')

// TODO: temporary workaround for making webpack 4 work across Node.js versions
// Remove once project upgraded to webpack 5
// https://stackoverflow.com/questions/69394632/webpack-build-failing-with-err-ossl-evp-unsupported/69691525#69691525
const crypto = require('crypto')
const crypto_orig_createHash = crypto.createHash
crypto.createHash = (algorithm) =>
  crypto_orig_createHash(algorithm === 'md4' ? 'sha256' : algorithm)

module.exports = {
  devServer: {
    contentBase: distPath,
    port: 9000,
    // make available over local network
    // with https access for webxr
    // host: '0.0.0.0',
    allowedHosts: ['.ngrok.io', 'localhost'],
    // https: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: path.join(__dirname, '../src/index.html'),
      inject: false,
    }),
    new CopyPlugin({
      patterns: [
        { from: './src/example-policies/', to: `${distPath}/` },
        { from: './src/assets/', to: `${distPath}/assets/` },
      ],
    }),
  ],
  resolve: {
    alias: {
      // forcegraph packages contain ESM and UMD flavors - force resolution to UMD entrypoints
      // TODO: Reconsider this as part of webpack 5 upgrade
      'three-forcegraph': path.resolve(__dirname, '../../../node_modules/three-forcegraph/dist/three-forcegraph.js'),
      'force-graph': path.resolve(__dirname, '../../../node_modules/force-graph/dist/force-graph.js'),
      'react-force-graph-2d': path.resolve(__dirname, '../../../node_modules/react-force-graph-2d/dist/react-force-graph-2d.js'),
    },
  }
}

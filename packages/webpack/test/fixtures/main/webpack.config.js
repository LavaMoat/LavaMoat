const LavaMoatPlugin = require('../../../src/plugin.js')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')

const defaultLmOptions = {
  lockdown: {
    errorTaming: 'unsafe',
    mathTaming: 'unsafe',
    dateTaming: 'unsafe',
    consoleTaming: 'unsafe',
  },
  policyLocation: path.resolve(__dirname, 'policy'),
  readableResourceIds: true,
  runChecks: true,
  diagnosticsVerbosity: 0,
  HtmlWebpackPluginInterop: true,
}

module.exports = makeConfig()

Object.defineProperty(module.exports, 'makeConfig', {
  enumerable: false,
  value: makeConfig,
})

function makeConfig(lmOptions = {}) {
  return {
    entry: {
      app: './main.js',
    },
    mode: 'production',
    output: {
      filename: '[name].js',
      path: '/dist',
    },
    devtool: false,
    plugins: [
      new LavaMoatPlugin({
        ...defaultLmOptions,
        ...lmOptions,
      }),
      new MiniCssExtractPlugin({
        filename: 'styles/[name].css',
        // experimentalUseImportModule: false, // turns off some module execution at build time
      }),
      new HtmlWebpackPlugin(),
    ],
    resolve:{
      fallback: { "crypto": false }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  '@babel/preset-env',
                  '@babel/preset-typescript',
                ],
              },
            },
          ],
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            LavaMoatPlugin.exclude,
          ],
          sideEffects: true,
        },
      ],
    },
  }
}

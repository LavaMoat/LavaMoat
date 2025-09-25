const LavaMoatPlugin = require('../../../src/plugin.js')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')

const defaultLmOptions = {
  policyLocation: path.resolve(__dirname, 'policy'),
  readableResourceIds: true,
  runChecks: true,
  diagnosticsVerbosity: 1,
  HtmlWebpackPluginInterop: true,
}

module.exports = makeConfig()

Object.defineProperty(module.exports, 'makeConfig', {
  enumerable: false,
  value: makeConfig,
})

/** @import {LavaMoatPluginOptions} from '../../../src/plugin.js' */
/** @import {Configuration as WebpackConfiguration} from 'webpack' */

/**
 * @param {LavaMoatPluginOptions} lmOptions
 * @returns {WebpackConfiguration}
 */
function makeConfig(lmOptions = {}) {
  return {
    cache: false,
    entry: {
      app: './main.js',
    },
    mode: 'production',
    output: {
      filename: '[name].js',
      path: '/dist',
      publicPath: '', // running bundles under node errors out when webpack attempts to figure out relative paths at runtime if this is not set
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
    optimization: {
      concatenateModules: true, // only here to trigger explicit warning about being set back to false
    },
    resolve: {
      fallback: { crypto: false },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env', '@babel/preset-typescript'],
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
        {
          // when a loader is explicitly used to emit assets they are allowed for backwards compatibility
          test: /\.svg$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name].[ext]',
              },
            },
          ],
        },
        {
          test: /\.gif$/,
          type: 'asset',
          // This explicit configuration is here so that the setting could be found. Webpack applies a default threshold if not stated
          parser: {
            dataUrlCondition: {
              maxSize: Infinity,
            },
          },
        },
      ],
    },
  }
}

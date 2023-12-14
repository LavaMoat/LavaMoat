const LavaMoatPlugin = require('../../../src/plugin.js')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')

module.exports = {
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
      lockdown: {
        errorTaming: 'unsafe',
        mathTaming: 'unsafe',
        dateTaming: 'unsafe',
        consoleTaming: 'unsafe',
      },
      policy: {
        resources: {
          'umd-package': {
            globals: {
              define: true,
            },
          },
        },
      },
      readableResourceIds: true,
      runChecks: true,
      diagnosticsVerbosity: 0,
      HtmlWebpackPluginInterop: true,
    }),
    new MiniCssExtractPlugin({
      filename: 'styles/[name].css',
      // experimentalUseImportModule: false, // turns off some module execution at build time
    }),
    new HtmlWebpackPlugin(),
  ],
  resolve: {
    alias: {
      // crypto: require.resolve('crypto-browserify'), // deliberately left out, becasue we're testing for ignored modules
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer/'),
      util: require.resolve('util/'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'esbuild-loader',
            options: {
              loader: 'ts',
              tsconfigRaw: {
                compilerOptions: {
                  noImplicitAny: true,
                  target: 'es6',
                  jsx: 'react',
                  moduleResolution: 'node',
                  allowSyntheticDefaultImports: true,
                  esModuleInterop: true,
                },
              },
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

const ScorchWrap = require('../../../src/plugin.js')
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
    new ScorchWrap({
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
    }),
    new MiniCssExtractPlugin({
      filename: 'styles/[name].css',
      // experimentalUseImportModule: false, // turns off some module execution at build time
    }),
    new HtmlWebpackPlugin({
      template: './index.html',
    }),
  ],
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
        use: [MiniCssExtractPlugin.loader, 'css-loader', ScorchWrap.ignore],
        sideEffects: true,
      },
    ],
  },
}

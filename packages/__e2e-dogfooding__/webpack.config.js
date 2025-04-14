const path = require('node:path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const LavaMoatPlugin = require('@lavamoat/webpack')

module.exports = {
  entry: './src/index.tsx',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env',
                '@babel/preset-typescript',
                [
                  '@babel/preset-react',
                  {
                    pragma: 'h',
                    pragmaFrag: 'Fragment',
                  },
                ],
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
          LavaMoatPlugin.exclude, // Exclude CSS from being wrapped in Compartments
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
  plugins: [
    new LavaMoatPlugin({
      policyLocation: path.resolve(__dirname, 'lavamoat/webpack'),
      generatePolicy: false,
      HtmlWebpackPluginInterop: true, // Automatically add lockdown script tag
      runChecks: true,
    }),
    new HtmlWebpackPlugin(),
    new MiniCssExtractPlugin(),
  ],
  devtool: 'source-map',
}

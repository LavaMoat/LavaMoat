const HtmlWebPackPlugin = require("html-webpack-plugin");
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path')
const distPath = path.join(__dirname, '../dist')

module.exports = {
  devServer: {
    contentBase: distPath,
    port: 9000,
    // make available over local network
    // with https access for webxr
    host: '0.0.0.0',
    https: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: path.join(__dirname, "../src/index.html")
    }),
    new CopyPlugin({
      patterns: [
        { from: './src/example-config-debug.js', to: `${distPath}/injectConfigDebugData.js` },
      ],
    }),
  ]
}
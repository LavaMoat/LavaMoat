const path = require("path");
const MYPLUGIN = require('../src/plugin.js');

module.exports = {
  entry: "./app.js",
  mode: "development",
  output: {
    filename: "app.bundle.js",
  },
  devtool: false,
  plugins: [
    new MYPLUGIN(),
  ],

  module: {
    rules: [
      // Warning - this loader produces errors if the bundle in dist is not valid JS. No idea why it looks there
      // Other than that quirk it just works
      // {
      //   test: /\.ts$/,
      //   use: "ts-loader",
      //   exclude: /node_modules/,
      // },
      {
        test: /\.ts$/,
        use: [
          {
            loader: "esbuild-loader",
            options: {
              loader: "ts",
              // format: "cjs",
            }
          }
        ],
        exclude: /node_modules/,
      },
    
    ],
  },
  // resolve: {
  //   extensions: [".tsx", ".ts", ".js", ".mjs"],
  // },
};

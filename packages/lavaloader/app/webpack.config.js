const path = require("path");

module.exports = {
  entry: "./app.js",
  mode: "development",
  output: {
    filename: "app.bundle.js",
  },
  devtool: false,

  module: {
    rules: [
      // {
      //   test: /\.tsx?$/,
      //   use: "ts-loader",
      //   exclude: /node_modules/,
      // },
      {
        test: /.*/,
        loader: "babel-loader",
        exclude: /node_modules/,
      },
      {
        test: /.*/,
        use: [
          {
            loader: path.resolve("../loader.js"),
            options: { which: ">>standalone" },
          },
        ],
        enforce: "post",
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
};

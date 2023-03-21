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
      // this also works
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
            options: { 
              // feels like policies should be passed here 
             },
          },
        ],
        // important bit of magic - makes sure this runs after all other stuff
        enforce: "post",
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
};

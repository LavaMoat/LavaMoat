const path = require("path");
const MYPLUGIN = require('../src/plugin2.js');

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
      // this also works
      // {
      //   test: /\.tsx?$/,
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
              format: "cjs",
            }
          }
        ],
        exclude: /node_modules/,
      },
      // {
      //   test: /\.(mjs|js)$/,
      //   use: [
      //     {
      //       loader: "esbuild-loader",
      //       options: {
      //         format: "cjs",              
      //       }
      //     }
      //   ],
      // },
      // {
      //   test: /.*/,
      //   use: [
      //     {
      //       loader: path.resolve("../src/loader.js"),
      //       options: { 
      //         // feels like policies should be passed here 
      //         // or at least the path to policies so the loader can fetch them
      //        },
      //     },
      //   ],
      //   // important bit of magic - makes sure this runs after all other stuff
      //   enforce: "post",
      // },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".mjs"],
  },
};

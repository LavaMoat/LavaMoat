const ScorchWrap = require("../src/plugin.js");
const { ProgressPlugin } = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
var VirtualModulesPlugin = require('webpack-virtual-modules');

var virtualModules = new VirtualModulesPlugin({
  './_LM_RUNTIME_': require('fs').readFileSync('../src/runtime.js').toString(),
});

module.exports = {
  entry: "./app.js",
  // both modes work
  // mode: "production",
  mode: "development",
  output: {
    filename: "app.bundle.js",
  },
  // sourcemaps remain correct and don't seem to contain artifacts from the wrapper
  devtool: false,
  // devtool: "source-map",
  plugins: [
    new ScorchWrap({
      runChecks: true,
      diagnosticsVerbosity: 2,
    }),
    virtualModules,
    new ProgressPlugin(),
    new MiniCssExtractPlugin({
      filename: 'styles/[name].css',
      experimentalUseImportModule: false
    }),
  ],
  module: {
    rules: [
      // Warning - this loader reads all files in the project, not jsut the ones that are imported. I didn't want to dive further into fixing the config.
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
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        // look for .css or .scss files
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          // "style-loader",
          "css-loader",
        ],
        sideEffects: true,
      },
    ],
  },
};

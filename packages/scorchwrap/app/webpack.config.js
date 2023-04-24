const ScorchWrap = require("../src/plugin.js");

module.exports = {
  entry: "./app.js",
  // both modes work
  mode: "production", 
  // mode: "development",
  output: {
    filename: "app.bundle.js",
  },
  // sourcemaps remain correct and don't seem to contain artifacts from the wrapper
  devtool: "source-map",
  plugins: [
    new ScorchWrap({
      runChecks: true,
      diagnosticsVerbosity: 2,
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
    ],
  },
};

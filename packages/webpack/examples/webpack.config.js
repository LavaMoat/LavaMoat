const LavaMoat = require('../src/plugin.js')
const { ProgressPlugin } = require('webpack')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')

module.exports = {
  entry: {
    app: {
      import: './app.js',
      dependOn: 'shared',
    },
    app2: {
      import: './app2.js',
      dependOn: 'shared',
    },
    shared: 'leftpad',
  },
  // both modes work
  // mode: "production",
  mode: 'development',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  optimization: {
    runtimeChunk: 'single',
  },
  // sourcemaps remain correct and don't seem to contain artifacts from the wrapper
  devtool: false,
  // devtool: "source-map",
  plugins: [
    new LavaMoat({
      lockdown: {
        errorTaming: 'unsafe',
        mathTaming: 'unsafe',
        dateTaming: 'unsafe',
        consoleTaming: 'unsafe',
      },
      generatePolicy: true,
      readableResourceIds: true,
      runChecks: true,
      diagnosticsVerbosity: 1,
      HtmlWebpackPluginInterop: true,
    }),
    // virtualModules,
    new ProgressPlugin(),
    new MiniCssExtractPlugin({
      filename: 'styles/[name].css',
      // experimentalUseImportModule: false, // turns off some module execution at build time
    }),
    new HtmlWebpackPlugin(),
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
            loader: 'esbuild-loader',
            options: {
              loader: 'ts',
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
          'css-loader',
          LavaMoat.exclude,
        ],
        sideEffects: true,
      },
    ],
  },
}

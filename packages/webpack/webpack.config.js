const LavaMoatPlugin = require('./plugin')

module.exports = {
  mode: 'production',
  optimization: {
    minimize: false,
    concatenateModules: false,
  },
  plugins: [
    new LavaMoatPlugin()
  ]
}
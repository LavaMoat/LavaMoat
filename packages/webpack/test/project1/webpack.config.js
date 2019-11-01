const LavaMoatPlugin = require('../../src/index')

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
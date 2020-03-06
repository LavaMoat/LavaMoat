const LavaMoatPlugin = require('../../src/index')

module.exports = {
  optimization: {
    concatenateModules: false,
    minimize: false
  },
  plugins: [
    new LavaMoatPlugin({
      writeAutoConfig: true
    })
  ]
}
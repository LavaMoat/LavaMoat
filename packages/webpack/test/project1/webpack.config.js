const LavaMoatPlugin = require('../../src/index')

module.exports = {
  optimization: {
    concatenateModules: false,
  },
  plugins: [
    new LavaMoatPlugin({
      writeAutoConfig: true
    })
  ]
}
const { createPackageDataStream } = require('./createPackageDataStream.js')

module.exports = { applyPackageData }

function applyPackageData (browserify) {
  browserify.pipeline.get('emit-deps').unshift(createPackageDataStream())
}

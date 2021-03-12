const path = require('path')
const { PassThrough } = require('readable-stream')
const duplexify = require('duplexify')
const concatStream = require('concat-stream')
const { applySourceTransforms } = require('lavamoat-core')

module.exports = {
  createSesWorkaroundsTransform
}

function createSesWorkaroundsTransform () {
  return makeStringTransform('ses-workarounds', { excludeExtension: ['.json'] }, (content) => {
    return applySourceTransforms(content)
  })
}

function makeStringTransform (name, options, transformHandler) {
  return function (file) {
    if (options.excludeExtension) {
      if (options.excludeExtension.includes(path.extname(file))) {
        return new PassThrough()
      }
    }
    return makeTransformStream(transformHandler)
  }
}

function makeTransformStream (transformHandler) {
  const outStream = new PassThrough()
  return duplexify(
    concatStream((buffer) => {
      let transformed
      try {
        transformed = transformHandler(buffer.toString('utf8'))
      } catch (err) {
        outStream.destroy(err)
        return
      }
      outStream.end(transformed)
    }),
    outStream
  )
}

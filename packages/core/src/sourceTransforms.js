const { applyTransforms, evadeHtmlCommentTest, evadeImportExpressionTest } = require('../lib/transforms.umd.js')

function applySourceTransforms (source) {
  return applyTransforms(source, [
    evadeHtmlCommentTest,
    evadeImportExpressionTest,
    evadeDirectEvalExpressions
  ])
}

function evadeDirectEvalExpressions (source) {
  /* eslint-disable-next-line prefer-regex-literals */
  const someDirectEvalPattern = new RegExp('\\beval(\\s*\\()', 'g')

  const replaceFn = (_, p1) => `(eval)${p1}`
  return source.replace(someDirectEvalPattern, replaceFn)
}

module.exports = {
  applySourceTransforms
}

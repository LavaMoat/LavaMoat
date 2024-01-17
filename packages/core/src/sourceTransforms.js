const {
  applyTransforms,
  evadeHtmlCommentTest,
  evadeImportExpressionTest,
} = require('../lib/transforms.umd.js')

function applySourceTransforms(source) {
  return applyTransforms(source, [
    evadeHtmlCommentTest,
    evadeImportExpressionTest,
    evadeDirectEvalExpressions,
  ])
}

// create the RegExp once to avoid creating it over and over again
// helps work around https://github.com/MetaMask/metamask-extension/issues/21006
const someDirectEvalPattern = new RegExp('\\beval(\\s*\\()', 'g')
function evadeDirectEvalExpressions(source) {
  /* eslint-disable-next-line prefer-regex-literals */

  const replaceFn = (_, p1) => `(0,eval)${p1}`
  return source.replace(someDirectEvalPattern, replaceFn)
}

module.exports = {
  applySourceTransforms,
}

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
const someDirectEvalPattern = /\beval(\s*\()/g
const DIRECT_EVAL_REPLACE_FN = (_, p1) => '(0,eval)' + p1
function evadeDirectEvalExpressions(source) {
  // NOTE: str.replace is not affected by .lastIndex so we can reuse the regex
  return source.replace(someDirectEvalPattern, DIRECT_EVAL_REPLACE_FN)
}

module.exports = {
  applySourceTransforms,
}

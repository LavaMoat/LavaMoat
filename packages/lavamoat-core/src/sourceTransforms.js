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

const DIRECT_EVAL_REPLACE_FN = (_, p1) => '(0,eval)' + p1
function evadeDirectEvalExpressions(source) {
  return source.replace(
    /\beval(\s*\()/g,
    DIRECT_EVAL_REPLACE_FN
  )
}

module.exports = {
  applySourceTransforms,
}

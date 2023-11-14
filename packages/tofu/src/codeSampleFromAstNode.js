module.exports = { codeSampleFromAstNode }

/**
 *
 * @param {import('@babel/types').Node & {loc: import('@babel/types').SourceLocation}} node
 * @param {import('lavamoat-core').LavamoatModuleRecord} moduleRecord
 * @returns
 */
function codeSampleFromAstNode(node, moduleRecord) {
  const result = {}
  const { content } = moduleRecord
  const { start, end } = node.loc
  result.range = `${start.line}:${start.column}`
  if (end) {
    result.range += `,${end.line}:${end.column}`
  }
  // prepare sample
  const lines = /** @type {string} */ (content).split('\n')
  const startLine = lines[start.line - 1]
  const sample = startLine.slice(start.column, start.column + 70)
  result.sample = sample
  // add npmfs link if possible
  // need to separately specify npm name if possible
  // if (packageName && packageVersion && specifier) {
  //   // https://npmfs.com/package/bluebird/3.5.5/js/browser/bluebird.core.js#L2714:22-L27:2414
  //   const relativeFile = specifier.split(`${packageName}/`)[1]
  //   let rangePart = `L${start.line}:${start.column}`
  //   if (end) rangePart += `-L${end.line}:${end.column}`
  //   const url = `https://npmfs.com/package/${packageName}/${packageVersion}/${relativeFile}#${rangePart}`
  //   result.npmfs = url
  // }
  return result
}

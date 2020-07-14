
module.exports = { codeSampleFromAstNode }

function codeSampleFromAstNode (node, moduleRecord) {
  const result = {}
  const { specifier, content, packageName, packageVersion } = moduleRecord
  const { start, end } = node.loc
  result.range = `${start.line}:${start.column},${end.line}:${end.column}`
  // prepare sample
  const lines = content.split('\n')
  const startLine = lines[start.line - 1]
  const sample = startLine.slice(start.column, start.column + (70))
  result.sample = sample
  // add npmfs link if possible
  if (packageName && packageVersion && specifier) {
    // https://npmfs.com/package/moment/2.24.0/locale/ca.js#L81
    const [_, relativeFile] = specifier.split(`${packageName}/`)
    const url = `https://npmfs.com/package/${packageName}/${packageVersion}/${relativeFile}#L${start.line}`
    result.npmfs = url
  }
  return result
}

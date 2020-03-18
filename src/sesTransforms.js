const { makeStringTransform } = require('browserify-transform-tools')

module.exports = {
  createSesWorkaroundsTransform,
  applyInheritsLooseWorkaround
}

function createSesWorkaroundsTransform () {
  return makeStringTransform('ses-workarounds', { excludeExtension: ['.json'] }, (content, _, cb) => {
    let moduleContent = content
      // html comment
      .split('-->').join('-- >')
      // use indirect eval
      .split(' eval(').join(' (eval)(')
    // "inheritsLoose" workaround
    moduleContent = applyInheritsLooseWorkaround(moduleContent)
    cb(null, moduleContent)
  })
}

function applyInheritsLooseWorkaround (sourceString) {
  // a pattern used by many modules but incompatible with SES due to setting constructor
  // this horrible regex should catch minified code too
  const inheritsPattern = new RegExp('function _inheritsLoose\\((\\w+),\\s?(\\w+)\\)\\s?{\\s*?\\1.prototype\\s?=\\s?Object.create\\(\\2.prototype\\)[a-zA-z.=;,\\s\\(\\)]*}', 'g')
  // gather results
  let patternResult
  const searchResults = []
  while (patternResult = inheritsPattern.exec(sourceString)) {
    const start = patternResult.index
    const end = start + patternResult[0].length
    searchResults.push([start, end])
  }
  // replace results
  const replacementString = 'function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype, { constructor: { value: subClass } }); subClass.__proto__ = superClass; }'
  let offset = 0
  searchResults.forEach(([start, end]) => {
    const origLength = end - start
    const lengthDiff = replacementString.length - origLength
    sourceString = sourceString.slice(0, offset + start) + replacementString + sourceString.slice(offset + end)
    offset += lengthDiff
  })
  return sourceString
}

const { makeStringTransform } = require('browserify-transform-tools')

module.exports = {
  createSesWorkaroundsTransform
}

function createSesWorkaroundsTransform () {
  return makeStringTransform('ses-workarounds', { excludeExtension: ['.json'] }, (content, _, cb) => {
    const moduleContent = content
      // html comment
      .split('-->').join('-- >')
      // use indirect eval
      .split(' eval(').join(' (eval)(')
    cb(null, moduleContent)
  })
}

const { makeStringTransform } = require('browserify-transform-tools')


module.exports = makeStringTransform('lavamoat-browserify-workarounds', { excludeExtension: ['.json'] }, (content, _, cb) => {
  const result = content
    // fix html comments
    .split('-->').join('-- >')
    // fix direct eval
    .split(' eval(').join(' (eval)(')
    .split('\neval(').join('\n(eval)(')

  cb(null, result)
})
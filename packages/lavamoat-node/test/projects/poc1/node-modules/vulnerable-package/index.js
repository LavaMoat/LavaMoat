let evilPackageImportAllowed = true
let lavaMoatError
try {
  require('evil-package')
  lavaMoatError = 'NONE'
} catch (err) {
  evilPackageImportAllowed = false
  lavaMoatError = err.message
}

module.exports = {
  evilPackageImportAllowed,
  lavaMoatError,
}

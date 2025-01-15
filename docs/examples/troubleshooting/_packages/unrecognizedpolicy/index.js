const globalToUse = 'process'

function unrecognizedPolicy() {
  const capturedGlobal = this || global

  // attempt to get cwd
  const cwd = capturedGlobal[globalToUse].cwd()
  console.log('Current working directory:', cwd)
  return cwd
}

module.exports = {
  elaborateCwdCheck() {
    return unrecognizedPolicy()
  },
}

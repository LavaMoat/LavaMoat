module.exports = {
  createConsole,
}

function createConsole() {
  return {
    assert: console.assert.bind(console),
    debug: console.debug.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
    log: console.log.bind(console),
    warn: console.warn.bind(console),
  }
}

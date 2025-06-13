let level = 0
let startTime = 0
module.exports = {
  set level(value) {
    level = value
  },
  get level() {
    return level
  },
  /**
   * Run the callback if verbosity is greater or equal given number
   *
   * @param {number} verbosity
   * @param {function} cb
   */
  run: (verbosity, cb) => {
    if (level >= verbosity) {
      return cb()
    }
  },

  /**
   * @param {number} verbosity
   * @param {any} content
   */
  rawDebug: (verbosity, content) => {
    if (level >= verbosity) {
      let prefix = '\n  >'
      if (level > 2) {
        const now = Date.now()
        if (!startTime) {
          startTime = now
        }
        prefix = `\n  [${now - startTime}] >`
      }
      // @ts-expect-error - trust me, the method exists
      process._rawDebug(prefix, content)
    }
  },
}

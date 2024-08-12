let level = 0
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
      // @ts-expect-error - trust me, the method exists
      process._rawDebug(content)
    }
  },
}

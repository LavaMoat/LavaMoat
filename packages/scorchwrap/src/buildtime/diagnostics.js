let level = 0;
module.exports = {
  set level(value) {
    level = value;
  },
  get level() {
    return level;
  },
  /**
   *
   * @param {number} verbosity
   * @param {function} cb
   */
  run: (lvl, cb) => {
    if (level >= lvl) {
      return cb();
    }
  },
  /**
   *
   * @param {number} verbosity
   * @param {any} content
   */
  rawDebug: (lvl, content) => {
    if (level >= lvl) {
      process._rawDebug(content);
    }
  },
};

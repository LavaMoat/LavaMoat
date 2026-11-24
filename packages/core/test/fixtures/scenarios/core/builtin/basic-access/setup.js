'use strict'
// Fake builtins injected before lockdown; the runtime reads module.exports.builtins
module.exports = {
  builtins: {
    abc: 123,
  },
}

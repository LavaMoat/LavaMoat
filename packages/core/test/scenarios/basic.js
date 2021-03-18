const { createScenarioFromScaffold } = require('../util.js')

module.exports = [
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'basic - bundle works',
      defineOne: () => {
        module.exports = require('two')(5)
      },
      defineTwo: () => {
        module.exports = function (n) { return n * 111 }
      },
      expectedResult: 555
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'basic - npm buffer toLocaleString support',
      defineOne: () => {
        // ensure userspace Buffer supported with lockdown
        // https://github.com/feross/buffer/blob/795bbb5bda1b39f1370ebd784bea6107b087e3a7/index.js#L611
        function Buffer (_arg, _encodingOrOffset, _length) {}
        Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype)
        Object.setPrototypeOf(Buffer, Uint8Array)
        Buffer.prototype.toLocaleString = Buffer.prototype.toString
        // dummy testResult to make sure everything worked
        module.exports = 123
      },
      expectedResult: 123
    })
    return scenario
  }
]

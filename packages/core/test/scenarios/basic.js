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
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'basic - Function constructor for constructing constructor functions',
      defineOne: () => {
        const abc = new Function("this.value = this.derp()")
        abc.prototype.derp = function() { return 123 }
        const xyz = new abc()
        module.exports = xyz.value
      },
      expectedResult: 123
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'basic - Node error stacktrace functionality allowed',
      defineOne: () => {
        // taken from depd package
        function callSiteToString () {
          var limit = Error.stackTraceLimit
          var obj = {}
          var prep = Error.prepareStackTrace
        
          function prepareObjectStackTrace (obj, stack) {
            return stack
          }
        
          Error.prepareStackTrace = prepareObjectStackTrace
          Error.stackTraceLimit = 2
        
          // capture the stack
          Error.captureStackTrace(obj)
        
          // slice the stack
          var stack = obj.stack.slice()
        
          Error.prepareStackTrace = prep
          Error.stackTraceLimit = limit
        
          return 123
        }

        module.exports = callSiteToString()
      },
      expectedResult: 123
    })
    return scenario
  }
]

(() => {
        const one = require('one')
        const getResult = one.get()
        const checkResult = globalThis.check(getResult)
        console.log(JSON.stringify(checkResult, null, 2))
      }).call(this)
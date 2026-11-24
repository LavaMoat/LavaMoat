(function _defineEntry() {
    // @ts-expect-error - does not exist
    const testResult = require('one')
    console.log(JSON.stringify(testResult, null, 2))
  }).call(this)
require('flag-package') // include in the bundle fo testcase convenience, but nothing is actually called
const dynamicStealer = require('dynamic-stealer')

dynamicStealer.loadDep().then(() => {
  console.log('dynamic-stealer loaded')
  TEST_FINISHED() // can't really handle async stuff otherwise from the test runner
})

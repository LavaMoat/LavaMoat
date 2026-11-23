// date-now is tamed by SES; this fixture verifies Date.now() still returns a
// recent timestamp for both the root compartment and non-root packages.
;(function () {
  const SINCE_2020 = 1577836800000
  const rootNow = Date.now()
  const nonRootNow = require('one')
  const ok =
    typeof rootNow === 'number' &&
    rootNow > SINCE_2020 &&
    typeof nonRootNow === 'number' &&
    nonRootNow > SINCE_2020
  console.log(JSON.stringify(ok, null, 2))
}).call(this)

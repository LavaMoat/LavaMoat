;(function () {
  const one = require('one')
  const zyx = document // root can access document
  console.log(JSON.stringify(one, null, 2))
}).call(this)

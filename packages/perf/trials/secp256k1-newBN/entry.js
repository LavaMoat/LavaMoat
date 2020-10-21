const BN = require('secp256k1/lib/js/bn')

// use `global.process` so it works correctly under node
const nTimes = Number.parseInt(global.process.env.PERF_N || 5, 10)

Array(nTimes).fill().forEach((_, index) => {

  new BN()

})


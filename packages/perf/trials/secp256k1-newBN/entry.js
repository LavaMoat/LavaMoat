const BN = require('secp256k1/lib/js/bn')

// use globalThis.process to avoid hardcoding value when bundling
const nTimes = Number.parseInt(globalThis.process.env.PERF_N || 5, 10)

let value
for (let i = 0; i < nTimes; i++) {
  value = new BN()
}

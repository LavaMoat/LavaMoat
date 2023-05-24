const { thirdparty: { fromEtherCamp: brainwallet } } = require('ethereumjs-wallet')

// use globalThis.process to avoid hardcoding value when bundling
const nTimes = Number.parseInt(globalThis.process.env.PERF_N || 5, 10)

for (let index = 0; index < nTimes; index++) {
  const wallet = brainwallet(`brain wallet seed #${index}`)
  console.log(wallet.getAddressString())
}

// use `global.process` so it works correctly under node
const nTimes = Number.parseInt(globalThis.process.env.PERF_N || 5, 10)

// only do local math (dont use imported modules)
let count = 0
for (let _index = 0; _index < nTimes; _index++) {
  count += 1
}

const { minify } = require('terser')

// use `global.process` so it works correctly under node
const nTimes = Number.parseInt(global.process.env.PERF_N || 5, 10)

loop()

async function loop () {
  for (let index = 0; index < nTimes; index++) {
    await main()
  }
}

async function main () {
  await minify({
    "file1.js": "function add(first, second) { return first + second; }",
    "file2.js": "console.log(add(1 + 2, 3 + 4));"
  })
}
const { performTest } = require('../../performTask')

const nRange = [0, 100]

const tasks = {
  'node': {
    run: 'node entry.js',
  },
  'lavamoat': {
    prep: 'lavamoat entry.js --writeAutoPolicy',
    run: 'lavamoat entry.js',
  },
  // 'endo-unsafe': {
  //   run: 'node ../../endo.js',
  // },
}

performTest(tasks, nRange)

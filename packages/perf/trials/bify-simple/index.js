const { performTest } = require('../../performTask')

const nRange = [1, 10]

const tasks = {
  'node': {
    run: 'node entry.js',
  },
  // 'lavamoat-node': {
  //   run: 'lavamoat entry.js',
  // },
  'lavamoat-no-defense': {
    run: 'lavamoat entry.js --applyExportsDefense=false',
  },
}

performTest(tasks, nRange)

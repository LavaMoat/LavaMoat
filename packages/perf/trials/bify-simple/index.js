const { performTest } = require('../../performTask')

const nRange = [0, 100]

const tasks = {
  'node': {
    run: 'node entry.js',
  },
  'lavamoat-node': {
    prep: 'lavamoat entry.js --writeAutoPolicy',
    run: 'lavamoat entry.js',
  },
  'lavamoat-node scuttle': {
    prep: 'lavamoat entry.js --writeAutoPolicy',
    run: 'lavamoat entry.js --scuttleGlobalThis --scuttleGlobalThisExceptions=console RegExp Array process',
  },
  // 'endo-unsafe': {
  //   run: 'node ../../endo.js',
  // },
}

performTest(tasks, nRange)

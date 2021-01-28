const { performTest } = require('../../performTask')

const nRange = [1, 10]

const tasks = {
  'node': {
    run: 'node entry.js',
  },
  'lavamoat-no-defense': {
    run: 'lavamoat entry.js',
  },
}

performTest(tasks, nRange)

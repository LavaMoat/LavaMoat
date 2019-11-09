const { performTest } = require('../../performTask')

const nRange = [1, 50, 100, 250, 500, 750, 1000]
// const nRange = [1, 50]

const tasks = {
  'node': {
    run: 'node entry.js',
  },
  'bify': {
    prep: 'yarn build:unsafe',
    run: 'node bundle.js',
  },
  'bify+lavamoat': {
    prep: 'yarn build',
    run: 'node bundle.js',
  },
  'bify+lavamoat w/ harden': {
    prep: 'yarn build:harden',
    run: 'node bundle.js',
  },
}

performTest(tasks, nRange)

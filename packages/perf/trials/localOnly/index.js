const { performTest } = require('../../performTask')

const nRange = [1, 5000000, 10000000, 25000000, 50000000, 75000000, 100000000]

const tasks = {
  'node': {
    run: 'node entry.js',
  },
  'bify': {
    prep: 'yarn build:unsafe',
    run: 'node bundle.js',
  },
  'bify+ses': {
    // reuse previous build
    run: `node -p "require('ses').makeSESRootRealm().evaluate(require('fs').readFileSync('./bundle.js','utf8'), { global })"`,
  },
  'bify+lavamoat': {
    prep: 'yarn build',
    run: 'node bundle.js',
  },
  // 'bify+lavamoat w/ harden': {
  //   prep: 'yarn build:harden',
  //   run: 'node bundle.js',
  // },
}

performTest(tasks, nRange)

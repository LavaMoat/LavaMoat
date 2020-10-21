const { performTest } = require('../../performTask')

const nRange = [1, 50000, 100000, 250000, 500000, 750000, 1000000]
// const nRange = [1, 50]

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

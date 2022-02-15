const { performTest } = require('../../performTask')

const nRange = [1, 5000000, 10000000, 25000000, 50000000, 75000000, 100000000]

const tasks = {
  'node': {
    run: 'node entry.js',
  },
  'bify': {
    prep: 'npm run build:unsafe',
    run: 'node bundle.js',
  },
  'bify+ses': {
    // reuse previous build
    run: `node -p "require('ses').makeSESRootRealm().evaluate(require('fs').readFileSync('./bundle.js','utf8'), { global })"`,
  },
  'bify+lavamoat': {
    prep: 'npm run build',
    run: 'node bundle.js',
  },
  // 'bify+lavamoat w/ harden': {
  //   prep: 'npm run build:harden',
  //   run: 'node bundle.js',
  // },
}

performTest(tasks, nRange)

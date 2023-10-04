const { performTest } = require('../../performTask')

const nRange = [0, 5e9]

const tasks = {
  node: {
    run: 'node entry.js',
  },
  bify: {
    prep: 'yarn build:unsafe',
    run: 'node bundle/unsafe.js',
  },
  // 'bify+ses': {
  //   // reuse previous build
  //   run: `node -p "require('ses').makeSESRootRealm().evaluate(require('fs').readFileSync('./bundle.js','utf8'), { global })"`,
  // },
  'lavamoat-bify': {
    prep: 'yarn build:default',
    run: 'node bundle/default.js',
  },
  'lavamoat-node': {
    prep: 'lavamoat entry.js --writeAutoPolicy',
    run: 'lavamoat entry.js',
  },
  'endo-unsafe': {
    run: 'node ../../endo.js',
  },
  // 'bify+lavamoat w/ harden': {
  //   prep: 'yarn build:harden',
  //   run: 'node bundle.js',
  // },
}

performTest(tasks, nRange)

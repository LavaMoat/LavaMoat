const { performTest } = require('../../performTask')

const nRange = [0, 25]

const tasks = {
  node: {
    run: 'node entry.js',
  },
  'lavamoat-node': {
    prep: 'lavamoat entry.js --writeAutoPolicy',
    run: 'lavamoat entry.js',
  },
  bify: {
    prep: 'yarn build:unsafe',
    run: 'node bundle/unsafe.js',
  },
  'lavamoat-bify': {
    prep: 'yarn build:default',
    run: 'node bundle/default.js',
  },
  'endo-unsafe': {
    run: 'node ../../endo.js',
  },
  // ses rejects some eval?
  // 'bify+ses': {
  //   // reuse previous build
  //   run: `node -p "require('ses').makeSESRootRealm().evaluate(require('fs').readFileSync('./bundle.js','utf8'), { global })"`,
  // },
  // 'bify+lavamoat w/ harden': {
  //   prep: 'yarn build:harden',
  //   run: 'node bundle/harden.js',
  // },
}

performTest(tasks, nRange)

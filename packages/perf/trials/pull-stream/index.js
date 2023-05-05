const { performTest } = require('../../performTask')

const nRange = [0, 1e7]

const tasks = {
  'node': {
    run: 'node entry.js',
  },
  'bify': {
    prep: 'yarn build:unsafe',
    run: 'node bundle/unsafe.js',
  },
  'lavamoat-node': {
    prep: 'lavamoat entry.js --writeAutoPolicy',
    run: 'lavamoat entry.js',
  },
  'lavamoat-bify': {
    prep: 'yarn build:default',
    run: 'node bundle/default.js',
  },
  // 'bify+ses': {
  //   // reuse previous build
  //   run: `node -p "global.globalThis=global;require('lavamoat-core/lib/ses.umd.js');lockdown();const c = new Compartment({ global });c.evaluate(require('fs').readFileSync('./bundle.js','utf8'))"`,
  // },
  // 'bify+ses-nolockdown': {
  //   // reuse previous build
  //   run: `node -p "global.globalThis=global;require('lavamoat-core/lib/ses.umd.js');const c = new Compartment({ global });c.evaluate(require('fs').readFileSync('./bundle.js','utf8'))"`,
  // },
}

performTest(tasks, nRange)

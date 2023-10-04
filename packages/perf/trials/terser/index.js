const { performTest } = require('../../performTask')

const nRange = [0, 1000]

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
  // 'endo-unsafe': {
  //   run: 'node ../../endo.js',
  // },
  // 'bify+ses': {
  //   // reuse previous build
  //   run: `node -p "global.globalThis=global;require('lavamoat-core/lib/ses.umd.js');lockdown({ errorTaming: 'unsafe' });const c = new Compartment({ global });c.evaluate(require('fs').readFileSync('./bundle.js','utf8').split('-->').join('-- >').split('<!--').join('<! --').split('import(').join('__import__('))"`,
  // },
  // 'bify+ses-nolockdown': {
  //   // reuse previous build
  //   run: `node -p "global.globalThis=global;require('lavamoat-core/lib/ses.umd.js');const c = new Compartment({ global });c.evaluate(require('fs').readFileSync('./bundle.js','utf8').split('-->').join('-- >').split('<!--').join('<! --').split('import(').join('__import__('))"`,
  // },
}

performTest(tasks, nRange)

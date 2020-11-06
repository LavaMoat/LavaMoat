const { performTest } = require('../../performTask')

const nRange = [0, 1000 ]

const tasks = {
  'node': {
    run: 'node entry.js',
  },
  'lavamoat-node': {
    run: 'lavamoat entry.js',
  },
  'lavamoat-no-defense': {
    run: 'lavamoat entry.js --applyExportsDefense=false',
  },
  'bify': {
    prep: 'browserify entry.js > bundle.js',
    run: 'node bundle.js',
  },
  'bify+ses': {
    // reuse previous build
    run: `node -p "global.globalThis=global;require('lavamoat-core/lib/ses.umd.js');lockdown({ errorTaming: 'unsafe' });const c = new Compartment({ global });c.evaluate(require('fs').readFileSync('./bundle.js','utf8').split('-->').join('-- >').split('<!--').join('<! --').split('import(').join('__import__('))"`,
  },
  'bify+ses-nolockdown': {
    // reuse previous build
    run: `node -p "global.globalThis=global;require('lavamoat-core/lib/ses.umd.js');const c = new Compartment({ global });c.evaluate(require('fs').readFileSync('./bundle.js','utf8').split('-->').join('-- >').split('<!--').join('<! --').split('import(').join('__import__('))"`,
  },
}

performTest(tasks, nRange)

const { performTest } = require('../../performTask')

const nRange = [0, 1, 10]

const tasks = {
  'node': {
    run: 'node entry.js',
  },
  'lavamoat-node': {
    run: 'lavamoat entry.js',
  },
  'bify': {
    prep: 'browserify entry.js > bundle.js',
    run: 'node bundle.js',
  },
  'bify+ses': {
    // reuse previous build
    run: `node -p "global.globalThis=global;require('lavamoat-core/lib/ses.umd.js');lockdown();const c = new Compartment({ global });c.evaluate(require('fs').readFileSync('./bundle.js','utf8'))"`,
  },
  'bify+ses-nolockdown': {
    // reuse previous build
    run: `node -p "global.globalThis=global;require('lavamoat-core/lib/ses.umd.js');const c = new Compartment({ global });c.evaluate(require('fs').readFileSync('./bundle.js','utf8'))"`,
  },
}

performTest(tasks, nRange)

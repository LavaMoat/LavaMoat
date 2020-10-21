const { performTest } = require('../../performTask')

const nRange = [0, 5000, 10000, 25000, 50000, 75000, 100000]
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

main()

async function main () {
  const results = await performTest(tasks, nRange)

  // remove startup time
  const bifyBaseline = results['bify'].slice(-1)[0] - results['bify'][0]
  const lavamoat = results['bify+lavamoat'].slice(-1)[0] - results['bify+lavamoat'][0]
  // const lavamoatHarden = results['bify+lavamoat w/ harden'].slice(-1)[0] - results['bify+lavamoat w/ harden'][0]

  const lavamoatPerf = lavamoat/bifyBaseline
  // // const lavamoatHardenPerf = lavamoatHarden/bifyBaseline

  log(`lavamoatPerf: ${lavamoatPerf.toFixed(1)}`)
  // // log(`lavamoatHardenPerf: ${lavamoatHardenPerf.toFixed(1)}`)
}

function log (input) {
  process.stderr.write(`${JSON.stringify(input, null, 2)}\n`)
}
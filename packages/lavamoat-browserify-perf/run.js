const util = require('util')
const exec = util.promisify(require('child_process').exec)

const nRange = [1, 50, 100, 250, 500, 750, 1000]
// const nRange = [1, 50]
const tasks = {
  'without': {
    prep: 'yarn build:unsafe',
    run: 'node bundle.js',
  },
  'with': {
    prep: 'yarn build',
    run: 'node bundle.js',
  },
  'harden': {
    prep: 'yarn build:harden',
    run: 'node bundle.js',
  },
}

performTest()

async function performTest () {
  const results = {}
  for (const [taskName, task] of Object.entries(tasks)) {
    process.stderr.write(`running task "${taskName}"...\n`)
    if (task.prep) await runCommand(`${task.prep}`)
    for (const nValue of nRange) {
      const runTime = await runCommand(`PERF_N=${nValue} ${task.run}`)
      // init results container
      const resultsContainer = results[taskName] = results[taskName] || []
      resultsContainer.push(runTime)
    }
  }
  process.stdout.write(resultsAsCsv(results))
}

async function runCommand(command) {
  const start = process.hrtime.bigint()
  const { stdout, stderr } = await exec(command)
  const end = process.hrtime.bigint()
  const duration = end - start
  const durationSeconds = Number(duration)/1e9
  return durationSeconds
}

function resultsAsCsv (results) {
  let csv = `n, ${Object.keys(results)}\n`

  const stats = Object.values(results)
  for (const [index, nValue] of Object.entries(nRange)) {
    csv += `${nValue},${stats.map(data => data[index])}\n`
  }
  return csv
}

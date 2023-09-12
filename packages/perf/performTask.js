const util = require('util')
const exec = util.promisify(require('child_process').exec)

module.exports = { performTest }


async function performTest (tasks, nRange) {
  const results = {}
  for (const [taskName, task] of Object.entries(tasks)) {
    if (task.prep) {
      console.warn(`running task prep "${taskName}"...`)
      await runCommand(`${task.prep}`)
    }
    console.warn(`running task "${taskName}"...`)
    for (const nValue of nRange) {
      const runTime = await runCommand(`PERF_N=${nValue} ${task.run}`)
      // init results container
      const resultsContainer = results[taskName] = results[taskName] || []
      resultsContainer.push(runTime)
    }
  }
  // sort results by key
  const sortedResults = Object.fromEntries(Object.entries(results).sort(([a], [b]) => {
    return b > a ? -1 : 1
  }))
  // log results
  process.stdout.write(resultsAsCsv(sortedResults, nRange))
  return results
}

async function runCommand(command) {
  const start = process.hrtime.bigint()
  await exec(command, { env: process.env })
  const end = process.hrtime.bigint()
  const duration = end - start
  const durationSeconds = Number(duration)/1e9
  return durationSeconds
}

function resultsAsCsv (results, nRange) {
  let csv = `n, ${Object.keys(results)}\n`

  const stats = Object.values(results)
  for (const [index, nValue] of Object.entries(nRange)) {
    csv += `${nValue},${stats.map(data => data[index])}\n`
  }
  return csv
}

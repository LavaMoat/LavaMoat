module.exports = { makeInitStatsHook }

function makeInitStatsHook ({ onStatsReady }) {
  let statModuleStack = []
  return reportStatsHook

  function reportStatsHook (event, moduleId) {
    if (event === 'start') {
      // record start
      const startTime = Date.now()
      // console.log(`loaded module ${moduleId}`)
      const statRecord = {
        "name": moduleId,
        "value": null,
        "children": [],
        "startTime": startTime,
        "endTime": null
      }
      // add as child to current
      if (statModuleStack.length > 0) {
        const currentStat = statModuleStack[statModuleStack.length - 1]
        currentStat.children.push(statRecord)
      }
      // set as current
      statModuleStack.push(statRecord)
    } else if (event === 'end') {
      const endTime = Date.now()
      const currentStat = statModuleStack[statModuleStack.length - 1]
      // sanity check, should only get an end for the current top of stack
      if (currentStat.name !== moduleId) {
        console.error(`stats hook misaligned "${currentStat.name}", "${moduleId}" ${statModuleStack.map(e => e.name).join()}`)
      }
      currentStat.endTime = endTime
      const startTime = currentStat.startTime
      const duration = endTime - startTime
      currentStat.value = duration
      // console.log(`loaded module ${moduleId} in ${duration}ms`)
      // check if totally done
      if (statModuleStack.length === 1) {
        currentStat.version = 1
        onStatsReady(currentStat)
      }
      statModuleStack.pop()
    }
  }

}
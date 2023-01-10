/* eslint-disable no-shadow */

const path = require('path')

export const nodeEnvConfig = {
  builtins: {
    orangeBuiltins: [
      'buffer',
      'console',
      //deprecated
      // 'domain',
      'events',
    ],
  },
  globals: {
    orangeGlobals: [
      'Buffer',
      'buffer',
      //deprecated
      // 'domain',
      'events',
      'console',
    ],
  },
}

export const bifyEnvConfig = {
  globals: {
    orangeGlobals: [
    ],
  },
  builtins: {
    orangeBuiltins: [
    ],
  },
}

function parseConfigDebugForPackages (policyName, policyDebugData, policyFinal) {
  // const { resources } = policyDebugData
  // const nodes = [], links = []
  const packages = {}
  const envConfig = getEnvConfigForPolicyName(policyName)
  const { debugInfo } = policyDebugData
  const { resources } = policyFinal
  // aggregate info under package name
  Object.entries(debugInfo).forEach(([_, moduleDebugInfo]) => {
    const { moduleRecord } = moduleDebugInfo
    const packageId = moduleRecord.packageName
    let packageData = packages[packageId]
    // if first moduleRecord in package, initialize with moduleRecord
    if (!packageData) {
      packageData = {}
      packages[packageId] = packageData
      packageData.id = packageId
      packageData.importMap = {}
      packageData.modules = []
      packageData.type = moduleRecord.type
      packageData.size = 0
      const isRootPackage = packageId === '$root$'
      packageData.isRoot = isRootPackage
      packageData.policy = resources[packageData.id] || {}
    }
    // add total code size from module
    packageData.size += moduleRecord.content.length
    // add package-relative file path
    moduleRecord.fileSimple = fullModuleNameFromPath(moduleRecord.file)
    // add module / package refs
    packageData.modules.push(moduleDebugInfo)
    moduleRecord.packageData = packageData
    // add deps
    Object.values(moduleRecord.importMap || {}).forEach((childId) => {
      // use `id` so that there are not redundant links. the actual key is not important.
      const { moduleRecord: childModuleData } = debugInfo[childId] || {}
      if (!childModuleData) {
        // console.warn(`dep is external module ${childId}`)
        return
      }
      packageData.importMap[childId] = childModuleData.packageName
    })
  })
  // modify danger rank
  Object.entries(packages).forEach(([_, packageData]) => {
    const dangerRank = getDangerRankForPackage(packageData, envConfig)
    packageData.dangerRank = dangerRank
  })

  return packages
}

function createGraph (packages, policyFinal, {
  lavamoatMode,
  selectedNode,
  hiddenPackages,
  // packageModulesMode,
  showPackageSize = true,
}) {
  const nodes = []
  const links = []
  // for each module, create node and links
  Object.entries(packages).forEach(([_, packageData]) => {
    const { importMap } = packageData
    const packageId = packageData.id
    // skip hidden packages
    if (hiddenPackages.includes(packageId)) {
      return
    }
    const size = showPackageSize ? radiusFromArea(packageData.size)/8 : 2
    const isLavamoat = lavamoatMode === 'lavamoat'
    const label = packageData.isRoot ? '(root)' : packageId
    const lavamoatColor = packageData.isRoot ? 'purple' : getColorForRank(packageData.dangerRank)
    const color = isLavamoat ? lavamoatColor : 'red'
    // create node for modules
    nodes.push(
      createNode({ id: packageId, val: 2, label, color, size }),
    )
    const selectedNodeId = selectedNode && selectedNode.id

    // create links for deps
    Object.keys(importMap).forEach((depName) => {
      const childId = String(importMap[depName])
      if (hiddenPackages.includes(childId)) {
        return
      }

      let width
      let linkColor

      if (packageId === selectedNodeId) {
        width = 3
        linkColor = 'green'
      }

      if (childId === selectedNodeId) {
        width = 3
        linkColor = 'blue'
      }

      links.push(
        createLink({ color: linkColor, width, source: packageId, target: childId }),
      )
    })
  })
  // handle missing nodes (e.g. external deps)
  links.forEach((link) => {
    if (!packages[link.target]) {
      nodes.push(
        createNode({ id: link.target, label: `${link.target} (external)`, size: 2 }),
      )
    }
  })

  return { nodes, links }
}

const rankColors = [
  'green', 'orange', 'brown', 'red',
]

function getDangerRankForPackage (packageData, envConfig) {
  if (packageData.dangerRank) {
    return packageData.dangerRank
  }
  // root is special case
  if (packageData.isRoot) {
    return -1
  }
  // strict red if any native
  if (packageData.policy.native) {
    return 3
  }
  const globalsRank = getRankForGlobals(packageData.policy.globals, envConfig)
  const builtinRank = getRankForBuiltins(packageData.policy.builtin, envConfig)
  const rank = Math.max(globalsRank, builtinRank)
  return rank
}

function getDangerRankForModule (moduleDebugInfo, envConfig) {
  const globalsRank = getRankForGlobals(moduleDebugInfo.globals, envConfig)
  const builtinRank = getRankForBuiltins(moduleDebugInfo.builtin, envConfig)
  const typeRank = getRankForType(moduleDebugInfo.moduleRecord.type)
  if (moduleDebugInfo.moduleRecord.packageName === 'JSONStream') {
    console.log({ id: moduleDebugInfo.moduleRecord.file, globalsRank, builtinRank, typeRank, envConfig })

  }
  const rank = Math.max(globalsRank, typeRank, builtinRank)
  return rank
}

function getColorForRank (rank) {
  if (rank === -1) {
    return 'purple'
  }
  return rankColors[rank]
}

function getRankForGlobals (globalsConfig, envConfig) {
  const globals = Object.keys(globalsConfig || {})
  if (globals.length === 0) {
    return 0
  }
  return Math.max(...globals.map((glob) => getRankForGlobal(glob, envConfig)))
}

function getRankForGlobal(glob, envConfig) {
  if (envConfig.globals.orangeGlobals.includes(glob)) {
    return 1
  }
  return 3
}

function getRankForBuiltins (builtinsConfig, envConfig) {
  const builtins = Object.keys(builtinsConfig || {})
  if (builtins.length === 0) {
    return 0
  }
  return Math.max(...builtins.map((builtin) => getRankForBuiltin(builtin, envConfig)))
}

function getRankForBuiltin(builtin, envConfig) {
  if (envConfig.builtins.orangeBuiltins.includes(builtin)) {
    return 1
  }
  return 3
}

function getRankForType (type = 'js') {
  if (type === 'js') {
    return 0
  }
  if (type === 'builtin') {
    return 3
  }
  if (type === 'native') {
    return 3
  }
  return 3
}

function createLink (params) {
  const { source, target } = params
  const link = {
    id: `${source}-${target}`,
    source,
    target,
    // value: 1,
    // distance: 30,
    ...params,
  }
  return link
}

function createNode (params) {
  const node = { // color: 'green',
    ...params,
  }
  return node
}

function radiusFromArea (area) {
  return Math.sqrt(area / Math.PI)
}

function fullModuleNameFromPath (file) {
  const segments = file.split(path.sep)
  const index = segments.lastIndexOf('node_modules')
  if (index === -1) {
    return undefined
  }
  const moduleName = segments.filter((segment) => segments.indexOf(segment) > index).join('/')
  return moduleName
}

function getLineNumbersForGlobals (source, globals) {
  const sourceLines = source.split(/\r\n|\r|\n/u)
  const regexList = []
  const sourceGlobalLines = sourceLines.reduce((filtered, line, sourceIndex) => {
    Object.keys(globals).forEach((key, index, array) => {
      if (regexList.length !== array.length) {
        const regex = new RegExp(`(^|\\W)${key}($|\\W)`, 'u')
        regexList.push(regex)
      }
      if (line.match(regexList[index])) {
        filtered.push(sourceIndex)
      }
    })
    return filtered
  }, [])
  return sourceGlobalLines
}

function getEnvConfigForPolicyName (policyName) {
  const envConfig = policyName === 'browserify' ? bifyEnvConfig : nodeEnvConfig
  return envConfig
}

function sortIntelligently () {
  return sortByStrategies([
    sortByDangerRank(),
    sortByPackageName(),
  ])
}

function sortByStrategies (sorterFns) {
  return function sort (a, b) {
    for (let i = 0; i < sorterFns.length; i++) {
      const sorter = sorterFns[i]
      const result = sorter(a, b)
      if (result !== 0) {
        return result
      }
    }
    return 0
  }
}

function sortByDangerRank () {
  return sortByKey('dangerRank', true)
}

function sortByPackageName () {
  return sortByKey('id')
}

function sortByKey (key, reverse = false) {
  const reverseVal = reverse ? -1 : 1
  return (a, b) => {
    const aVal = a[key], bVal = b[key]
    if (aVal === bVal) {
      return 0
    }
    return aVal > bVal ? reverseVal : -reverseVal
  }
}
  

export {
  parseConfigDebugForPackages,
  createGraph,
  getDangerRankForModule,
  getDangerRankForPackage,
  getColorForRank,
  fullModuleNameFromPath,
  getLineNumbersForGlobals,
  sortByDangerRank,
  getEnvConfigForPolicyName,
  sortIntelligently,
}

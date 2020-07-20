const path = require('path')

function parseConfigDebugForPackages (configDebugData) {
  // const { resources } = configDebugData
  // const nodes = [], links = []
  const packages = {}

  const { debugInfo } = configDebugData
  // aggregate info under package name
  Object.entries(debugInfo).forEach(([_, moduleDebugInfo]) => {
    const { moduleData } = moduleDebugInfo
    const packageNameAndVersion = getPackageVersionName(moduleData)
    let packageData = packages[packageNameAndVersion]
    // if first moduleData in package, initialize with moduleData
    if (!packageData) {
      packageData = {}
      packages[packageNameAndVersion] = packageData
      packageData.name = packageNameAndVersion
      packageData.id = packageNameAndVersion
      packageData.deps = {}
      packageData.modules = []
      packageData.size = 0
      const isRootPackage = packageNameAndVersion === '<root>'
      packageData.isRoot = isRootPackage
    }
    // add total code size from module
    const { size } = moduleData
    packageData.size += size

    // add module / package refs
    packageData.modules.push(moduleDebugInfo)
    moduleData.packageData = packageData
    // add deps
    Object.values(moduleData.deps || {}).forEach((childId) => {
      // use `id` so that there are not redundant links. the actual key is not important.
      const { moduleData: childModuleData } = debugInfo[childId] || {}
      if (!childModuleData) {
        console.warn(`dep is external module ${childId}`)
        return
      }
      packageData.deps[childId] = getPackageVersionName(childModuleData)
    })
  })

  // add dangerRank to packages
  Object.entries(packages).forEach(([_, packageData]) => {
    const dangerRank = getDangerRankForPackage(packageData)
    packageData.dangerRank = dangerRank
  })

  return packages
}

function createGraph (packages, configDebugData, {
  lavamoatMode,
  selectedNode,
  // packageModulesMode,
  showPackageSize,
}) {
  const { resources } = configDebugData
  const nodes = []
  const links = []
  // for each module, create node and links
  Object.entries(packages).forEach(([_, packageData]) => {
    const {
      file,
      deps,
      source,
    } = packageData
    const parentId = packageData.id
    const packageName = packageData.name
    const size = showPackageSize ? getNodeSize(source) : 2
    const configForPackage = resources[packageName] || {}
    const configLabel = JSON.stringify(configForPackage, null, 2)
    const label = `${file}`
    const isLavamoat = lavamoatMode === 'lavamoat'
    const lavamoatColor = packageData.isRootPackage ? 'purple' : getColorForRank(packageData.dangerRank)
    const color = isLavamoat ? lavamoatColor : 'red'
    // create node for modules
    nodes.push(
      createNode({ id: parentId, val: size, label, configLabel, color }),
    )
    const selectedNodeId = selectedNode && selectedNode.id

    // create links for deps
    Object.keys(deps).forEach((depName) => {
      const childId = String(deps[depName])

      let width
      let linkColor

      if (parentId === selectedNodeId) {
        width = 3
        linkColor = 'green'
      }

      if (childId === selectedNodeId) {
        width = 3
        linkColor = 'blue'
      }

      links.push(
        createLink({ color: linkColor, width, source: parentId, target: childId }),
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

const redAlertGlobals = [
  'chrome',
  'window',
  'document',
  'document.body',
  'document.body.appendChild',
  'location',
  'XMLHttpRequest',
  'fetch',
  'WebSocket',
  'crypto',
]

const orangeAlertGlobals = [
  'localStorage',
  'prompt',
]

const rankColors = [
  'green', 'orange', 'brown', 'red',
]

function getDangerRankForPackage (packageData) {
  const moduleRanks = packageData.modules.map(
    (moduleDebugInfo) => getDangerRankForModule(moduleDebugInfo),
  )
  const rank = Math.max(...moduleRanks)
  return rank
}

function getDangerRankForModule (moduleDebugInfo) {
  const configRank = getRankForConfig(moduleDebugInfo)
  const typeRank = getRankForType(moduleDebugInfo.moduleData.type)
  const rank = Math.max(configRank, typeRank)
  return rank
}

function getColorForRank (rank) {
  return rankColors[rank]
}

function getRankForConfig (config) {
  const rankGlobals = getRankForGlobals(config.globals)
  const rankBuiltins = getRankForBuiltins(config.builtin)
  const rank = Math.max(rankGlobals, rankBuiltins)
  return rank
}

// this is a denylist, it should be an allowlist
function getRankForGlobals (globalsConfig) {
  const globals = Object.keys(globalsConfig || {})
  if (globals.length === 0) {
    return 0
  }
  if (globals.some((glob) => redAlertGlobals.includes(glob))) {
    return 3
  }
  if (globals.some((glob) => orangeAlertGlobals.includes(glob))) {
    return 2
  }
  // has globals but nothing scary
  return 1
}

function getRankForBuiltins (builtinsConfig = []) {
  if (builtinsConfig.length > 0) {
    return 3
  }
  return 0

}

function getRankForType (type = 'js') {
  if (type === 'js') {
    return 0
  }
  // if (type === 'builtin') return 3
  // if (type === 'native') return 3
  return 3
}

function sortByDangerRank (data) {
  return Object.values(data).sort((a, b) => b.dangerRank - a.dangerRank)
}

function getPackageVersionName (moduleData) {
  const { id, packageName, packageVersion } = moduleData
  const name = moduleData.package || packageName || id
  if (packageVersion) {
    return `${name}@${packageVersion}`
  }
  return name

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

function getNodeSize (source) {
  const { length } = source.split(/\r\n|\r|\n/u)
  let size
  if (length < 50) {
    size = 2
  } else if (length > 50 && length < 100) {
    size = 3
  } else if (length > 100 && length < 250) {
    size = 5
  } else if (length > 250 && length < 500) {
    size = 7
  } else if (length > 500 && length < 1000) {
    size = 10
  } else if (length > 1000 && length < 2500) {
    size = 13
  } else {
    size = 16
  }
  return size
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

export {
  parseConfigDebugForPackages,
  createGraph,
  getDangerRankForModule,
  getDangerRankForPackage,
  getColorForRank,
  getPackageVersionName,
  fullModuleNameFromPath,
  getLineNumbersForGlobals,
  sortByDangerRank,
}

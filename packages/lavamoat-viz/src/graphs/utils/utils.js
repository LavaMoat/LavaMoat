function createPackageGraph(configDebugData, {
  lavamoatMode,
  selectedNode,
  packageModulesMode,
  showPackageSize
}) {
  // const { resources } = configDebugData
  // const nodes = [], links = []
  const packageData = {}

  const { debugInfo } = configDebugData
  // aggregate info under package name
  Object.entries(debugInfo).forEach(([parentId, { moduleData }]) => {
    const packageNameAndVersion = getPackageVersionName(moduleData)
    let pack = packageData[packageNameAndVersion]
    // if first moduleData in package, initialize with moduleData
    if (!pack) {
      pack = Object.assign({}, moduleData)
      pack.file = packageNameAndVersion
      pack.deps = {}
      packageData[packageNameAndVersion] = pack
    } else {
      // package already exists, just need add size (deps added later)
      const { size } = moduleData
      pack.size += size
    }
    // add deps
    Object.values(moduleData.deps || {}).forEach(childId => {
      // use `id` so that there are not redundant links. the actual key is not important.
      const { moduleData: childModuleData } = debugInfo[childId] || {}
      if (!childModuleData) return console.warn(`dep is external module ${childId}`)
      pack.deps[childId] = getPackageVersionName(childModuleData)
    })
  })

  
  // Object.entries(resources).map(([packageName, packageConfig]) => {
  //   // create node for modules
  //   const packageNameAndVersion
  //   nodes.push(
  //     createNode({ id: packageName, val: size, label, configLabel, color })
  //   )
  // })

  // return { nodes, links }

  // return createGraph(packageData, configDebugData, {
  const graph = createGraph(packageData, configDebugData, {
    lavamoatMode,
    selectedNode,
    packageModulesMode,
    showPackageSize
  })
  
  return graph
}

function createModuleGraph(configDebugData, {
  lavamoatMode,
  selectedNode,
  packageModulesMode,
  showPackageSize
}) {

}

function createGraph(graphInput, configDebugData, {
  lavamoatMode,
  selectedNode,
  packageModulesMode,
  showPackageSize
}) {
  const { resources } = configDebugData
  const nodes = [], links = []
  // for each module, create node and links 
  Object.entries(graphInput).forEach(([parentId, parentData]) => {
    const {
      file,
      deps,
      source,
    } = parentData
    const packageName = parentData.packageName || parentData.package || parentId
    const size = showPackageSize ? getNodeSize(source) : 2
    const packageVersionName = getPackageVersionName(parentData)
    const configForPackage = resources[packageName] || {}
    const configLabel = JSON.stringify(configForPackage, null, 2)
    const label = `${file}`
    const isEntryPackage = packageVersionName === '<root>'
    const isLavamoat = lavamoatMode === 'lavamoat'
    const lavamoatColor = isEntryPackage ? 'purple' : getColorForPackage(configForPackage)
    const color = isLavamoat ? lavamoatColor : 'red'
    // create node for modules
    nodes.push(
      createNode({ id: parentId, val: size, label, configLabel, color })
    )
    const selectedNodeId = selectedNode && selectedNode.id

    // create links for deps
    Object.keys(deps).forEach(depName => {
      const childId = String(deps[depName])

      let width = undefined
      let color = undefined

      if (parentId === selectedNodeId) {
        width = 3
        color = 'green'
      }

      if (childId === selectedNodeId) {
        width = 3
        color = 'blue'
      }

      links.push(
        createLink({ color, width, source: parentId, target: childId })
      )
    })
  })
  // handle missing nodes (e.g. external deps)
  links.forEach(link => {
    if (!graphInput[link.target]) {
      nodes.push(
        createNode({ id: link.target, label: `${link.target} (external)`, size: 2 })
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
  'green', 'orange', 'brown', 'red'
]

function getColorForPackage(packageConfig) {
  const rank = getRankForConfig(packageConfig)
  return getColorForRank(rank)
}

function getColorForModule (moduleDebugInfo) {
  const configRank = getRankForConfig(moduleDebugInfo)
  const typeRank = getRankForType(moduleDebugInfo.moduleData.type)
  const rank = Math.max(configRank, typeRank)
  return getColorForRank(rank)
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
function getRankForGlobals(globalsConfig) {
  const globals = Object.keys(globalsConfig || {})
  if (globals.length === 0) return 0
  if (globals.some(glob => redAlertGlobals.includes(glob))) {
    return 3
  }
  if (globals.some(glob => orangeAlertGlobals.includes(glob))) {
    return 2
  }
  // has globals but nothing scary
  return 1
}

function getRankForBuiltins (builtinsConfig = []) {
  if (builtinsConfig.length > 0) {
    return 3
  } else {
    return 0
  }
}

function getRankForType (type = 'js') {
  if (type === 'js') return 0
  // if (type === 'builtin') return 3
  // if (type === 'native') return 3
  return 3
}

function sortByColor(data) {
  let sorted = []
  rankColors.slice().reverse().forEach(color => {
    const filtered = data.filter(item => item.color === color)
    sorted = sorted.concat(filtered)
  })
  return sorted
}

function getPackageVersionName(moduleData) {
  const { id, packageName, packageVersion } = moduleData
  const name = moduleData.package || packageName || id
  if (packageVersion) {
    return `${name}@${packageVersion}`
  } else {
    return name
  }
}

function createLink(params) {
  const { source, target } = params
  const link = Object.assign({
    id: `${source}-${target}`,
    source,
    target,
    // value: 1,
    // distance: 30,
  }, params)
  return link
}

function createNode(params) {
  const node = Object.assign({
    // color: 'green',
  }, params)
  return node
}

function getNodeSize(source) {
  const length = source.split(/\r\n|\r|\n/).length
  let size
  if (length < 50) {
    size = 2
  } else if (50 < length && length < 100) {
    size = 3
  } else if (100 < length && length < 250) {
    size = 5
  } else if (250 < length && length < 500) {
    size = 7
  } else if (500 < length && length < 1000) {
    size = 10
  } else if (1000 < length && length < 2500 ) {
    size = 13
  } else {
    size = 16
  }
  return size
}

function fullModuleNameFromPath(file) {
  const path = require('path')
  const segments = file.split(path.sep)
  const index = segments.lastIndexOf('node_modules')
  if (index === -1) return
  let moduleName = segments.filter(segment => segments.indexOf(segment) > index).join('/')
  return moduleName
}

function getLineNumbersForGlobals(source, globals) {
  const sourceLines = source.split(/\r\n|\r|\n/)
  const regexList = [] 
  const sourceGlobalLines = sourceLines.reduce((filtered, line, sourceIndex) => {
    Object.keys(globals).forEach((key, index, array) => {
      if (regexList.length !== array.length) {
        const regex = new RegExp('(^|\\W)' + key + '($|\\W)')
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
  createPackageGraph,
  createModuleGraph,
  getColorForModule,
  getPackageVersionName,
  fullModuleNameFromPath,
  getLineNumbersForGlobals,
  sortByColor
}
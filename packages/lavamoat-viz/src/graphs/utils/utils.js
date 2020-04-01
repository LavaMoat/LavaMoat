import exampleConfig from '../../example-config.json'
const configData = self.CONFIG || exampleConfig

function createPackageGraph(bundleData, { sesifyMode, selectedNode, packageModulesMode }) {
  const packageData = {}
  // create a fake `bundleData` using the packages
  Object.entries(bundleData).forEach(([parentId, moduleData]) => {
    const packageName = getPackageVersionName(moduleData)
    let pack = packageData[packageName]
    // if first moduleData in package, initialize with moduleData
    if (!pack) {
      pack = Object.assign({}, moduleData)
      pack.file = packageName
      pack.deps = {}
      packageData[packageName] = pack
    } else {
      // package already exists, just need add size (deps added later)
      const { size } = moduleData
      pack.size += size
    }
    // add deps
    Object.values(moduleData.deps).forEach(childId => {
      // use `id` so that there are not redundant links. the actual key is not important.
      const childModuleData = bundleData[childId]
      if (!childModuleData) return console.warn(`dep is external module ${childId}`)
      pack.deps[childId] = getPackageVersionName(childModuleData)
    })
  })

  return createModuleGraph(packageData, { sesifyMode, selectedNode, packageModulesMode })
}

function createModuleGraph(bundleData, { sesifyMode, selectedNode, packageModulesMode }) {
  const nodes = [], links = []
  // for each module, create node and links 
  Object.entries(bundleData).forEach(([parentId, parentData]) => {
    const {
      file,
      deps,
      source,
      packageName
    } = parentData
    const packageVersionName = getPackageVersionName(parentData)
    //work here
    const size = getNodeSize(source)
    const configForPackage = configData.resources[packageName] || {}
    const configLabel = JSON.stringify(configForPackage, null, 2)
    const label = `${file}`
    const isEntryPackage = packageVersionName === '<root>'
    const isSesify = sesifyMode === 'sesify'
    const sesifyColor = isEntryPackage ? 'purple' : getColorForConfig(configForPackage, parentData, packageModulesMode)
    const color = isSesify ? sesifyColor : 'red'
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
    if (!bundleData[link.target]) {
      nodes.push(
        createNode({ id: link.target, label: 'External Dependency', size: 2 })
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

function getColorForConfig(packageConfig, parentData, packageModulesMode) {
  let globals
  if (packageModulesMode) {
    // no globals - should be safe
    if (Object.keys(parentData.globalUsage).length === 0) return 'green'
    globals = Object.keys(parentData.globalUsage)
  } else {
    // no globals - should be safe
    if (!packageConfig.globals) return 'green'
    globals = Object.keys(packageConfig.globals)
  }
  if (globals.some(glob => redAlertGlobals.includes(glob))) {
    return 'red'
  }
  if (globals.some(glob => orangeAlertGlobals.includes(glob))) {
    return 'brown'
  }
  // has globals but nothing scary
  return 'orange'
}

function getPackageVersionName({ packageName, packageVersion }) {
  if (packageVersion) {
    return `${packageName}@${packageVersion}`
  } else {
    return packageName
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
  const index = segments.indexOf('node_modules')
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
  getPackageVersionName,
  fullModuleNameFromPath,
  getLineNumbersForGlobals
}
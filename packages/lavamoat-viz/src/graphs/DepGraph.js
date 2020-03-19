// fix for silencing aframe errors
import './DepGraph.css'

const { ForceGraph2D } = require('react-force-graph')

const React = require('react')
const exampleConfig = require('../example-config.json')
const d3 = require('d3')
const moduleNameFromPath = require('module-name-from-path')

// const configData = require('../data/config.json')
const configData = self.CONFIG || exampleConfig

class DepGraph extends React.Component {

  constructor () {
    super()
    // prepare empty graph
    const graph = { nodes: [], links: [], container: { width: 0, height: 0 } }

    this.state = {
      packageData: graph,
      moduleData: null,
      packageModulesMode: false,
      packageModules: {}
    };
  }

  componentDidMount () {
    const { forceGraph } = this
    this.triggerGraphUpdate()

    window.xyz = forceGraph

    forceGraph.d3Force('charge').strength(-50)
    forceGraph.d3Force('x', d3.forceX(0, 1))
    forceGraph.d3Force('y', d3.forceY(0, 1))
  }

  componentWillReceiveProps (nextProps) {
    // recalculate graph if `bundleData` changes
    if (this.props.bundleData !== nextProps.bundleData
      || this.props.sesifyMode !== nextProps.sesifyMode) {
      this.triggerGraphUpdate(this.state, nextProps)
    }
  }

  triggerGraphUpdate (state = this.state, newProps = this.props) {
    const { bundleData } = newProps
    this.updateGraph(bundleData, newProps, state)
  }

  updateGraph (bundleData, props, state) {
    const {
      packageData,
      packageModules,
      packageModulesMode
    } = state

    let newGraph
    if (packageModulesMode) {
      newGraph = createModuleGraph(packageModules, props, state)
    } else {
      newGraph = createPackageGraph(bundleData, props, state)
    }
    // create a map for faster lookups by id
    const nodeLookup = new Map(newGraph.nodes.map(node => [node.id, node]))
    // copy simulation data from old graph

    const oldGraph = packageData
    oldGraph.nodes.forEach((oldNode) => {
      const newNode = nodeLookup.get(oldNode.id)
      if (!newNode) return
      const { x, y, vx, vy } = oldNode
      Object.assign(newNode, { x, y, vx, vy })
    })
    // commit new graph
    if (packageModulesMode) {
      this.setState(() => ({ moduleData: newGraph }))
    } else {
      this.setState(() => ({ packageData: newGraph }))
    }
  }

  getModulesForPackage (node) {
    const { bundleData } = this.props
    const { label } = node
    let packageModules = {}

    Object.entries(bundleData).forEach(([moduleId, moduleData]) => {
      if (getPackageVersionName(moduleData) === label) {
        packageModules[moduleId] = moduleData
      }
    })
    return packageModules
  }

  render () {
    const { 
      packageData,
      moduleData,
      selectedNode,
      packageModulesMode,
      packageModules
    } = this.state

    const actions = {
      selectNode: (node) => {
        const newState = { selectedNode: node }
        this.setState(newState)
        this.triggerGraphUpdate(Object.assign(this.state, newState))
      },
      togglePackageModules: (node) => {
        if (packageModulesMode) {
          this.setState({packageModulesMode: false})
          return
        }
        const modules = this.getModulesForPackage(node)
        const newState = {
          packageModulesMode: true,
          packageModules: modules
        }
        this.setState(newState)
        this.triggerGraphUpdate(Object.assign(this.state, newState))
      },
    }

    const data = packageModulesMode ? moduleData : packageData
    const selectedNodeLabel = selectedNode ? `${selectedNode.label}\n${selectedNode.configLabel}` : 'select a node'
    let globalUsagePackages = []
    globalUsagePackages = packageData.nodes.filter(node => JSON.parse(node.configLabel).hasOwnProperty('globals'))


    const packageListComponent = 
    <pre style={{
      position: 'absolute',
      left: '0px',
      height: '100%',
      overflowY: 'scroll',
      background: 'rgba(232, 232, 232, 0.78)',
      padding: '12px',
      // draw on top of graph
      zIndex: 1,
    }}>
      {"Packages containing globals\n\n"}
      <ol>
        {globalUsagePackages.map(node => 
          <li 
            key={globalUsagePackages.indexOf(node)}>
            <div 
            className='package'
            onMouseEnter={() => {
              if (packageModulesMode) return
              actions.selectNode(node)
            }}
            onClick={() => actions.togglePackageModules(node)}>
              {node.label}
            </div>
            {packageModulesMode && getPackageVersionName(Object.values(packageModules)[0]) === node.label ?
              <ol>
                {Object.entries(packageModules).map(([id, value], index) => 
                <li
                  key={id}>
                  <div 
                    className='package'
                    onMouseEnter={() => {
                      actions.selectNode(moduleData.nodes[index])
                    }}>
                    {fullModuleNameFromPath(value.file)}
                  </div>
                </li>
                )}
              </ol> :
              <ol/>
            }
          </li>)}
      </ol>
    </pre>

    return (
    <div>
      <div>
        {packageListComponent}
        <pre style={{
          position: 'absolute',
          right: 0,
          background: 'rgba(232, 232, 232, 0.78)',
          padding: '12px',
          // draw on top of graph
          zIndex: 1,
        }}>
            {packageModulesMode ? fullModuleNameFromPath(selectedNodeLabel) : selectedNodeLabel}
        </pre>
      </div>
        <ForceGraph2D
          ref={el => this.forceGraph = el}
          graphData={data}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          nodeLabel={'label'}
          onNodeHover={(node) => {
            if (!node) return
            actions.selectNode(node)
          }}
          onNodeClick={(node) => actions.togglePackageModules(node)}
          linkWidth={(link) => link.width}
          linkColor={(link) => link.color}
        />
      }
    </div>
    )
  }
}

export { DepGraph }

function createPackageGraph (bundleData, { sesifyMode }, { selectedNode }) {
  const packageData = {}
  // create a fake `bundleData` using the packages
  Object.entries(bundleData).forEach(([parentId, moduleData]) => {
    const packageName = getPackageVersionName(moduleData)
    let pack = packageData[packageName]
    // if first moduleData in package, initialize with moduleData
    if (!pack) {
      pack = Object.assign({}, moduleData)
      pack.file = packageName
      pack.entry = (packageName === '<root>')
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

  return createModuleGraph(packageData, { sesifyMode }, { selectedNode })
}

function createModuleGraph (bundleData, { sesifyMode }, { selectedNode }) {
  const nodes = [], links = []  
  // for each module, create node and links 
  Object.entries(bundleData).forEach(([parentId, parentData]) => {
    const { file, deps, size, entry, packageName } = parentData
    const packageVersionName = getPackageVersionName(parentData)
    const radius = 5
    const configForPackage = configData.resources[packageName] || {}
    const configLabel = JSON.stringify(configForPackage, null, 2)
    const label = `${file}`
    const isEntryPackage = packageVersionName === '<root>'
    const isSesify = sesifyMode === 'sesify'
    const sesifyColor = isEntryPackage ? 'purple' : getColorForConfig(configForPackage)
    const color = isSesify ? sesifyColor : 'red'
    // create node for modules
    nodes.push(
      createNode({ id: parentId, radius, label, configLabel, color })
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
        createNode({ id: link.target, radius: 0 })
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

function getColorForConfig (packageConfig) {
  // no globals - should be safe
  if (!packageConfig.globals) return 'green'
  const globals = Object.keys(packageConfig.globals)
  if (globals.some(glob => redAlertGlobals.includes(glob))) {
    return 'red'
  }
  if (globals.some(glob => orangeAlertGlobals.includes(glob))) {
    return 'brown'
  }
  // has globals but nothing scary
  return 'orange'
}

function getPackageVersionName ({ packageName, packageVersion }) {
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
    radius: 5,
  }, params)
  return node
}

function fullModuleNameFromPath(file) {
  const path = require('path')
  const segments = file.split(path.sep)
  const index = segments.indexOf('node_modules')
  if (index === -1) return
  let moduleName = segments.filter(segment => segments.indexOf(segment) > index).join('/')
  return moduleName
}
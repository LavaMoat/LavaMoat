import { ForceGraph2D, ForceGraph3D, ForceGraphVR } from 'react-force-graph'

const React = require('react')
const ObservableStore = require('obs-store')
const exampleConfig = require('../example-config.json')
const d3 = require('d3')

// const configData = require('../data/config.json')
const configData = self.CONFIG || exampleConfig

class DepGraph extends React.Component {

  constructor () {
    super()
    // prepare empty graph
    const graph = { nodes: [], links: [], container: { width: 0, height: 0 } }

    this.state = {
      data: graph,
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
    // recalculate graph if `mode` or `bundleData` change
    if (this.props.mode !== nextProps.mode
      || this.props.bundleData !== nextProps.bundleData
      || this.props.sesifyMode !== nextProps.sesifyMode) {
      triggerGraphUpdate(nextProps)
    }
  }

  triggerGraphUpdate (newProps = this.props) {
    const { state } = this
    const { bundleData } = newProps
    this.updateGraph(bundleData, newProps, state)
  }

  updateGraph (bundleData, props, state) {
    const newGraph = createGraphByMode(bundleData, props, state)
    // create a map for faster lookups by id
    const nodeLookup = new Map(newGraph.nodes.map(node => [node.id, node]))
    // copy simulation data from old graph
    const oldGraph = this.state.data
    oldGraph.nodes.forEach((oldNode) => {
      const newNode = nodeLookup.get(oldNode.id)
      if (!newNode) return
      const { x, y, vx, vy } = oldNode
      Object.assign(newNode, { x, y, vx, vy })
    })
    // commit new graph
    this.setState(() => ({ data: newGraph }))
  }

  render () {
    const actions = {
      selectNode: (node) => {
        this.setState(() => ({ selectedNode: node }))
        this.triggerGraphUpdate()
      }
    }

    const { data, selectedNode } = this.state
    const selectedNodeLabel = selectedNode ? `${selectedNode.label}\n${selectedNode.configLabel}` : 'select a node'

    return (
      <>
        <pre style={{
          position: 'absolute',
          background: 'rgba(232, 232, 232, 0.78)',
          padding: '12px',
          // draw on top of graph
          zIndex: 1,
        }}>
          {selectedNodeLabel}
        </pre>
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
          linkWidth={(link) => link.width}
          linkColor={(link) => link.color}
        />
      </>
    )
  }
}

export { DepGraph }


function createGraphByMode (bundleData, { mode, sesifyMode }, { selectedNode }) {
  // create graph for mode
  if (mode === 'modules') {
    return createModuleGraph(bundleData, { sesifyMode }, { selectedNode })
  } else {
    return createPackageGraph(bundleData, { sesifyMode }, { selectedNode })
  }
}

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
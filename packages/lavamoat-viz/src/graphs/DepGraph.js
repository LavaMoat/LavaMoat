import { ForceGraph2D, ForceGraph3D } from 'react-force-graph'

const React = require('react')
const ObservableStore = require('obs-store')
const { GraphContainer, ForceGraph, util: { createNode, createLink } } = require('react-force-directed')
const exampleConfig = require('../example-config.json')

// const configData = require('../data/config.json')
const configData = self.CONFIG || exampleConfig

class DepGraph extends React.Component {

  constructor () {
    super()
    // prepare empty graph
    this.graph = { nodes: [], links: [], container: { width: 0, height: 0 } }
    // contain graph in observable store
    this.graphStore = new ObservableStore(this.graph)
    this.triggerForceUpdate = this.triggerForceUpdate.bind(this)
    
    this.state = {
      data: {
        nodes: [{ id: 0 }],
        links: []
      }
    };
  }

  componentDidMount () {
    const { graphStore } = this
    // generate graph
    const { bundleData, mode, sesifyMode } = this.props
    this.updateGraph(bundleData, { mode, sesifyMode })
    graphStore.subscribe(this.triggerForceUpdate)

    window.xyz = this.fg

    this.fg.d3Force('link').strength(1)
  }

  componentWillUnmount () {
    const { graphStore } = this
    graphStore.unsubscribe(this.triggerForceUpdate)
  }

  triggerForceUpdate () {
    console.log('triggerForceUpdate', this.graphStore.getState())
    this.setState(() => ({ data: this.graphStore.getState() }))
    // this.graph = this.graphStore.getState()
    // this.forceUpdate()
  }

  componentWillReceiveProps (nextProps) {
    // recalculate graph if `mode` or `bundleData` change
    if (this.props.mode !== nextProps.mode
      || this.props.bundleData !== nextProps.bundleData
      || this.props.sesifyMode !== nextProps.sesifyMode) {
      const { bundleData, mode, sesifyMode } = nextProps
      this.updateGraph(bundleData, { mode, sesifyMode })
    }
  }

  updateGraph (bundleData, { mode, sesifyMode }) {
    const { nodes, links } = createGraphByMode(bundleData, { mode, sesifyMode })
    this.graphStore.updateState({ nodes, links })
  }

  // onResize (size) {
  //   this.graphStore.updateState({ container: size })
  // }

  render () {
    const actions = {
      selectNode: console.log
    }

    const { data } = this.state

    return (
      <ForceGraph2D
        ref={el => this.fg = el}
        graphData={data}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        onNodeHover={(node) => {
          if (!node) return
          console.log(node)
        }}
      />
    )
  }
}

export { DepGraph }


function createGraphByMode (bundleData, { mode, sesifyMode }) {
  // create graph for mode
  if (mode === 'modules') {
    return createModuleGraph(bundleData, { sesifyMode })
  } else {
    return createPackageGraph(bundleData, { sesifyMode })
  }
}

function createPackageGraph (bundleData, { sesifyMode }) {
  const packageData = {}
  
  // create a fake `bundleData` using the packages
  Object.keys(bundleData).forEach(parentId => {
    const module = bundleData[parentId]
    const { package: packageName } = module
    let pack = packageData[packageName]
    // if first module in package, initialize with module
    if (!pack) {
      pack = Object.assign({}, module)
      pack.file = `${packageName} files`
      pack.entry = (packageName === '<root>')
      pack.deps = {}
      packageData[packageName] = pack
    } else {
      // package already exists, just need add size (deps added later)
      const { size } = module
      pack.size += size
    }
    // add deps
    Object.values(module.deps).forEach(id => {
      // use `id` so that there are not redundant links. the actual key is not important.
      pack.deps[id] = bundleData[id].package
    })
  })

  return createModuleGraph(packageData, { sesifyMode })
}

function createModuleGraph (bundleData, { sesifyMode }) {
  const nodes = [], links = []

  // for each module, create node and links 
  Object.keys(bundleData).forEach(parentId => {
    const { file, package:packageName, deps, size, entry } = bundleData[parentId]
    const radius = 5
    const configForPackage = configData.resources[packageName] || {}
    const configLabel = JSON.stringify(configForPackage, null, 2)
    const label = `${packageName}\n${file}\n${configLabel}`
    const isEntryPackage = packageName === '<root>'
    const isSesify = sesifyMode === 'sesify'
    const sesifyColor = isEntryPackage ? 'purple' : getColorForConfig(configForPackage)
    const color = isSesify ? sesifyColor : 'red'
    // create node for modules
    nodes.push(
      createNode({ id: parentId, radius, label, color })
    )
    // create links for deps
    Object.keys(deps).forEach(depName => {
      const childId = String(deps[depName])
      links.push(
        createLink({ source: parentId, target: childId })
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
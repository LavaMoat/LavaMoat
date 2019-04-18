const React = require('react')
const ObservableStore = require('obs-store')
const GraphContainer = require('./GraphContainer')
const ForceGraph = require('./ForceGraph')
const {
  createNode,
  createLink,
} = require('./util')


class DepGraph extends React.Component {

  constructor () {
    super()
    // prepare empty graph
    this.graph = { nodes: [], links: [], container: { width: 0, height: 0 } }
    // contain graph in observable store
    this.graphStore = new ObservableStore(this.graph)
  }

  componentDidMount () {
    // generate graph
    const { bundleData, mode } = this.props
    this.updateGraph(bundleData, mode)
  }

  componentWillReceiveProps (nextProps) {
    console.log('componentWillReceiveProps', nextProps)
    // recalculate graph if `mode` or `bundleData` change
    if (this.props.mode !== nextProps.mode || this.props.bundleData !== nextProps.bundleData) {
      const { bundleData, mode } = nextProps
      this.updateGraph(bundleData, mode)
    }
  }

  updateGraph (bundleData, mode) {
    const { nodes, links } = createGraphByMode(bundleData, mode)
    this.graphStore.updateState({ nodes, links })
  }

  onResize (size) {
    this.graphStore.updateState({ container: size })
  }

  render () {
    const actions = {
      selectNode: console.log
    }

    return (
      <div className="fullSize" ref={this.containerRef}>
        <GraphContainer onSize={size => this.onResize(size)}>
          <ForceGraph graphStore={this.graphStore} actions={actions}/>
        </GraphContainer>
        {ForceGraph.createStyle()}
      </div>
    )
  }
}

module.exports = DepGraph

function labelForFileSize (size) {
  const fileSizeOrder = Math.floor((Math.log(size)/Math.log(10))/3)
  const fileSizeUnit = ['b','kb','mb'][fileSizeOrder]
  const fileSizeForUnit = size / Math.pow(10, fileSizeOrder * 3)
  const fileSizeForUnitFormatted = (size > 1000) ? fileSizeForUnit.toFixed(1) : fileSizeForUnit
  const fileSizeLabel = `${fileSizeForUnitFormatted} ${fileSizeUnit}`
  return fileSizeLabel
}

function createGraphByMode (bundleData, mode) {
  // create graph for mode
  if (mode === 'modules') {
    return createModuleGraph(bundleData)
  } else {
    return createPackageGraph(bundleData)
  }
}

function createPackageGraph (bundleData) {
  const packageData = {}
  
  // create a fake `bundleData` using the packages
  Object.keys(bundleData).forEach(parentId => {
    const module = bundleData[parentId]
    const { packageName } = module
    let pack = packageData[packageName]
    // if first module in package, initialize with module
    if (!pack) {
      pack = Object.assign({}, module)
      pack.file = `${packageName} files`
      pack.entry = (packageName === '<entry>')
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
      pack.deps[id] = id
    })
  })

  return createModuleGraph(packageData)
}

function createModuleGraph (bundleData) {
  const nodes = [], links = []

  // for each module, create node and links 
  Object.keys(bundleData).forEach(parentId => {
    const { file, packageName, deps, size, entry } = bundleData[parentId]
    const scale = 1 / 20
    const radius = scale * Math.sqrt(size)
    // const radius = 5
    const fileSizeLabel = labelForFileSize(size)
    const label = `${fileSizeLabel} ${packageName}\n${file}`
    const isEntryPackage = packageName === '<entry>'
    // entry module is orange
    // entry pacakge (app code) is blue
    // deps are green
    let color = entry ? 'orange' : (isEntryPackage ? 'blue' : 'green')
    // create node for modules
    nodes.push(
      createNode({ id: parentId, radius, label, color })
    )
    // create links for deps
    Object.keys(deps).forEach(depName => {
      const childId = deps[depName]
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
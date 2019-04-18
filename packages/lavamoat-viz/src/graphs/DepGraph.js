const React = require('react')
const ObservableStore = require('obs-store')
const GraphContainer = require('./GraphContainer')
// const ResizeComponent = require('./ResizeComponent')
const ForceGraph = require('./ForceGraph')
const {
  createNode,
  createNodes,
  createLink,
  createLinkToNext,
  createLinkToRandomNonNext,
} = require('./util')

// const bundleData = require('../data/deps-inpage.json')
// const bundleData = require('../data/deps-background.json')
const bundleData = require('../data/deps-ui.json')
// const bundleData = require('../data/deps-libs.json')

class DepGraph extends React.Component {
  constructor () {
    super()

    // prepare empty graph
    const nodes = []
    const links = []
    const container = {
      width: 0,
      height: 0,
    }
    this.graph = { nodes, links, container }
    
    // populate graph with bundleData
    this.createModuleGraph(bundleData)

    // contain graph in observable store
    this.graphStore = new ObservableStore(this.graph)
  }

  createModuleGraph (bundleData) {
    const { nodes, links } = this.graph
    
    // for each module, create node and links 
    Object.keys(bundleData).forEach(parentId => {
      const { file, packageName, deps, size, entry } = bundleData[parentId]
      const scale = 1 / 20
      const radius = scale * Math.sqrt(size)
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

  }

  onResize (size) {
    console.log('new size', size)
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
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

// const data = require('../data/deps-inpage.json')
// const data = require('../data/deps-background.json')
const data = require('../data/deps-ui.json')
// const data = require('../data/deps-libs.json')

class DepGraph extends React.Component {
  constructor () {
    super()

    const nodes = []
    const links = []
    
    Object.keys(data).forEach(parentId => {
      const { file, deps, size, entry } = data[parentId]
      const scale = 1 / 20
      const radius = scale * Math.sqrt(size)
      const fileSizeLabel = labelForFileSize(size)
      const label = `${fileSizeLabel} ${file}`
      const color = entry ? 'blue' : 'green'

      nodes.push(
        createNode({ id: parentId, radius, label, color })
      )
      Object.keys(deps).forEach(depName => {
        const childId = deps[depName]
        links.push(
          createLink({ source: parentId, target: childId })
        )
      })
    })

    // handle missing nodes (e.g. external deps)
    links.forEach(link => {
      if (!data[link.target]) {
        nodes.push(
          createNode({ id: link.target, radius: 0 })
        )
      }
    })

    const container = {
      width: 0,
      height: 0,
    }

    let graph = { nodes, links, container }

    this.graphStore = new ObservableStore(graph)
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
const React = require('react')
const ObservableStore = require('obs-store')
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
      // const radius = 5
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

    let graph = { nodes, links }

    const graphStore = new ObservableStore(graph)
    this.graphStore = graphStore
  }

  addNode () {
    const graph = this.graphStore.getState()
    const node = createNode()
    graph.nodes.push(node)

    const { nodes, links } = graph
    links.push(createLinkToRandomNonNext({ node, nodes }))
    links.push(createLinkToRandomNonNext({ node, nodes }))


    this.graphStore.putState(graph)
  }

  render () {
    const actions = {
      selectNode: console.log
    }

    return (
      <div className="fullSize">
        <svg width="100%" height="100%">
          <ForceGraph graphStore={this.graphStore} actions={actions}/>
        </svg>
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
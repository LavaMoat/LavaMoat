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

const data = require('../data/deps-inpage.json')
// const data = require('../data/deps-background.json')

class DepGraph extends React.Component {
  constructor () {
    super()

    const nodes = []

    const links = []
    
    Object.keys(data).forEach(childId => {
      nodes.push(
        createNode({ id: childId })
      )
      const parents = data[childId]
      parents.forEach(parentId => {
        links.push(
          createLink({ source: parentId, target: childId })
        )
        // handle parents not in graph
        if (!data[parentId]) {
          nodes.push(
            createNode({ id: parentId })
          )
        }
      })
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
    return (
      <div className="fullSize">
        <svg width="100%" height="100%">
          <ForceGraph graphStore={this.graphStore}/>
        </svg>
        {ForceGraph.createStyle()}
      </div>
    )
  }
}

module.exports = DepGraph

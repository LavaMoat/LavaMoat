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

class SimpleGraph extends React.Component {
  constructor () {
    super()

    const nodes = createNodes({ count: 3 })

    const links = [
      createLink({ source: nodes[0].id, target: nodes[1].id }),
      createLink({ source: nodes[0].id, target: nodes[2].id }),
    ]

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
      <div>
        <button onClick={() => this.addNode()}>new peer</button>
        <ForceGraph graphStore={this.graphStore}/>
      </div>
    )
  }
}

module.exports = SimpleGraph

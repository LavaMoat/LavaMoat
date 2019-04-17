const React = require('react')
const ObservableStore = require('obs-store')
const ForceGraph = require('./ForceGraph')
const {
  createConnectedGraph,
} = require('./util')
const timeout = (duration) => new Promise(resolve => setTimeout(resolve, duration))

class MultiGossipGraph extends React.Component {
  constructor () {
    super()

    const graphStore = new ObservableStore()
    this.graphStore = graphStore

    this.newGraph()
  }

  resetColors () {
    const graph = this.graphStore.getState()
    graph.nodes.forEach(node => {
      node.color = 'green'
    })
    this.graphStore.putState(graph)
  }

  async doGossip () {
    this.resetColors()
    const graph = this.graphStore.getState()
    const node1 = this.graph1.nodes[0]
    const node2 = this.graph2.nodes[0]
    const node3 = this.graph3.nodes[0]

    this.gossipFromNode({ graph, node: node1, color: 'orange' })
    this.gossipFromNode({ graph, node: node2, color: 'pink' })
    this.gossipFromNode({ graph, node: node3, color: 'purple' })
  }

  async gossipFromNode({ graph, node, color }) {
    const latency = 50
    node.color = color
    this.graphStore.putState(graph)
    await timeout(latency)
    const nodeLinks = graph.links.filter(linksMatchingCurrentNode)
    const nodePairs = nodeLinks.map(getPair)
    const newPairs = nodePairs.filter(pairNode => pairNode.color !== color)
    for (let pairNode of newPairs) {
      pairNode.color = color
      this.graphStore.putState(graph)
      await timeout(latency)
      this.gossipFromNode({ graph, node: pairNode, color })
    }

    function linksMatchingCurrentNode(link) {
      return link.target === node.id || link.source === node.id
    }

    function getPair(link) {
      const currentIsTarget = link.target === node.id
      const pairId = currentIsTarget ? link.source : link.target
      const pairNode = graph.nodes.find(node => node.id === pairId)
      return pairNode
    }
  }

  newGraph () {
    const graph1 = createConnectedGraph({ count: 16 })
    const graph2 = createConnectedGraph({ count: 34 })
    const graph3 = createConnectedGraph({ count: 8 })
    const graph = {
      nodes: [].concat(graph1.nodes, graph2.nodes, graph3.nodes),
      links: [].concat(graph1.links, graph2.links, graph3.links),
    }
    this.graphStore.putState(graph)
    this.graph1 = graph1
    this.graph2 = graph2
    this.graph3 = graph3
  }

  render () {
    return (
      <div>
        <button onClick={() => this.doGossip()}>gossip</button>
        <ForceGraph graphStore={this.graphStore}/>
      </div>
    )
  }
}

module.exports = MultiGossipGraph

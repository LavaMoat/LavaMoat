const React = require('react')
const { buildGraph, mergeGraph } = require('../viz/build')
const { setupSimulation, setupSimulationForces } = require('../viz/simulation')
const renderGraph = require('../viz/normal')


class ForceGraph extends React.Component {
  componentDidMount () {
    // setup force simulation
    this.graph = { nodes: [], links: [] }
    this.simulation = setupSimulation(this.graph)

    // setup update graph on change
    const { graphStore } = this.props
    graphStore.subscribe((newGraph) => this.updateGraph(newGraph))
    this.updateGraph(graphStore.getState())

    // setup re-render on simulation update
    this.simulation.on('tick', () => this.forceUpdate())
  }

  componentWillUnmount () {
    this.simulation.stop()
    // this.simulation.removeAllListeners()
    delete this.simulation
    delete this.graph
  }

  updateGraph (newGraph) {
    // merge with existing graph
    const currentGraph = this.graph
    const middlePoint = {
      // x: 960/2,
      // y: 600/2,
      x: 960/2,
      y: 0,
    }
    const mergedGraph = mergeGraph(currentGraph, newGraph, middlePoint)
    this.graph = mergedGraph
    // reset simulation
    setupSimulationForces(this.simulation, mergedGraph)
  }

  render () {
    const graph = this.graph
    if (!graph) return null

    return (
      <div>
        {renderGraph({ graph })}
        {style(`
          .links line {
            stroke: #999;
            stroke-opacity: 0.6;
          }
        `)}
      </div>
    )
  }
}

module.exports = ForceGraph

function style(styleContent) {
  return (
    <style dangerouslySetInnerHTML={{__html: styleContent}} />
  )
}

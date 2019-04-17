const d3 = require('d3')

const graphWidth = 960
const graphHeight = 600

module.exports = { setupSimulation, setupSimulationForces }

function setupSimulation(state) {
  const simulation = d3.forceSimulation()
  setupSimulationForces(simulation, state)
  return simulation
}

function setupSimulationForces (simulation, state) {
  const nodes = Object.values(state.nodes)
  const links = Object.values(state.links)

  simulation
    .nodes(nodes)
    // pull nodes along links
    .force('link', d3.forceLink().id(d => d.id).links(links).distance(d => d.distance))
    // push nodes away from each other
    .force('charge', d3.forceManyBody().strength(-30))
    // translate nodes around the center
    .force('center', d3.forceCenter(graphWidth / 2, graphHeight / 2))
    // push nodes towards the center
    .force('x', d3.forceX(graphWidth / 2, 0.05))
    .force('y', d3.forceY(graphHeight / 2, 0.05))
    .alphaTarget(0.3)
    .restart()
}

function createForce(forceFn) {
  let nodes
  const result = (alpha) => { forceFn(nodes, alpha) }
  result.initialize = (_nodes) => { nodes = _nodes }
  return result
}

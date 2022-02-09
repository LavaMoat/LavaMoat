const d3 = require('d3')
const forceBoundry2 = require('./forceBoundry.js').default

module.exports = { setupSimulation, setupSimulationForces }

function setupSimulation (state) {
  const simulation = d3.forceSimulation()
  setupSimulationForces(simulation, state)
  return simulation
}

function setupSimulationForces (simulation, state) {
  const nodes = Object.values(state.nodes)
  const links = Object.values(state.links)
  const width = state.container.width || 0
  const height = state.container.height || 0

  simulation
    .nodes(nodes)
    // pull nodes along links
    .force('link', d3.forceLink().id((d) => d.id).links(links).distance((d) => d.distance))
    // push nodes away from each other
    .force('charge', d3.forceManyBody().strength((d) => -4 * d.radius))
    .force('collision', d3.forceCollide().radius((d) => 1.2 * d.radius))
    // translate nodes around the center
    .force('center', d3.forceCenter(width / 2, height / 2))
    // push nodes towards the center
    .force('x', d3.forceX(width / 2, 1))
    .force('y', d3.forceY(height / 2, 1))
    // push nodes back into frame
    .force('boundry', forceBoundry2(0, 0, width, height))
    // warm then cool
    .alpha(1)
    .alphaTarget(0)
    .restart()
}

// function createForcePerNode (forceFn) {
//   return createForce((nodes, alpha) => {
//     for (let index = 0; index < nodes.length; index++) {
//       const node = nodes[index]
//       forceFn(node, alpha)
//     }
//   })
// }

// function createForce (forceFn) {
//   let nodes
//   const result = (alpha) => {
//     forceFn(nodes, alpha)
//   }
//   result.initialize = (_nodes) => {
//     nodes = _nodes
//   }
//   return result
// }

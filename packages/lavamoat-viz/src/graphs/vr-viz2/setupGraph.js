import ThreeForceGraph from 'three-forcegraph'

export default function setupGraph ({ scene, graph, subscribeTick }) {
  const scale = 0.001
  graph.scale.set(scale, scale, scale)
  graph.position.set(0, 1.5, 0)
  subscribeTick(() => graph.tickFrame())
  scene.add(graph)
  return { graph }
}

export function createRandomGraph () {
  const N = 6;
  const gData = {
    nodes: [...Array(N).keys()].map(i => ({ id: i })),
    links: [...Array(N).keys()]
      .filter(id => id)
      .map(id => ({
        source: id,
        target: Math.round(Math.random() * (id-1))
      }))
  };

  const Graph = new ThreeForceGraph()
    .graphData(gData);

  // add node connected to random
  setInterval(() => {
    const { nodes, links } = Graph.graphData();
    const id = nodes.length;
    Graph.graphData({
      nodes: [...nodes, { id }],
      links: [...links, { source: id, target: Math.floor(Math.random() * id) }]
    });
  }, 1000);

  return Graph
}

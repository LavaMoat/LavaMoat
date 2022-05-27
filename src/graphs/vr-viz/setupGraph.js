export default function setupGraph ({ scene, graph, subscribeTick }) {
  const scale = 0.001
  graph.scale.set(scale, scale, scale)
  graph.position.set(0, 1.5, 0)
  subscribeTick(() => graph.tickFrame())
  scene.add(graph)
  return { graph }
}

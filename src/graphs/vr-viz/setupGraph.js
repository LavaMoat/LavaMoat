import { Group } from 'three';

export default function setupGraph ({ scene, graph, lineController, subscribeTick }) {
  const scale = 0.001
  const group = new Group()
  group.scale.set(scale, scale, scale)
  group.position.set(0, 1.5, 0)
  group.add(graph)
  group.add(lineController.object)
  scene.add(group)
  subscribeTick(() => graph.tickFrame())
  return { graph }
}

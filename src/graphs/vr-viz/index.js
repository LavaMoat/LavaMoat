import * as THREE from 'three';
import setupScene from './setupScene.js'
import setupSelections from './setupSelections.js'
import setupGraph from './setupGraph.js'

const { scene, controller1, controller2, subscribeTick } = setupScene()

// this reality is virtual, so it might not work
// no guarantees meat popsicle
const { graph } = setupGraph({ scene, subscribeTick })
setupSelections({ getIntersectables, controller1, controller2, subscribeTick })

Object.assign(globalThis, { scene, graph })

function getIntersectables () {
  return graph.children.filter(child => child.type === 'Mesh')
}

function onSelectStart (intersection) {
  const { nodes, links } = Graph.graphData();
  const targetId = intersection.id
  const node = nodes.find(node => node.id === targetId)
  if (node) return
  node.color = '#00aaaa'
}

function createRandomObjects () {
  var geometries = [
    new THREE.BoxBufferGeometry(0.2, 0.2, 0.2),
    new THREE.ConeBufferGeometry(0.2, 0.2, 64),
    new THREE.CylinderBufferGeometry(0.2, 0.2, 0.2, 64),
    new THREE.IcosahedronBufferGeometry(0.2, 3),
    new THREE.TorusBufferGeometry(0.2, 0.04, 64, 32)
  ];

  for (var i = 0; i < 50; i++) {

    var geometry = geometries[Math.floor(Math.random() * geometries.length)];
    var material = new THREE.MeshStandardMaterial({
      color: Math.random() * 0xffffff,
      roughness: 0.7,
      metalness: 0.0
    });

    var object = new THREE.Mesh(geometry, material);

    object.position.x = Math.random() * 4 - 2;
    object.position.y = Math.random() * 2;
    object.position.z = Math.random() * 4 - 2;

    object.rotation.x = Math.random() * 2 * Math.PI;
    object.rotation.y = Math.random() * 2 * Math.PI;
    object.rotation.z = Math.random() * 2 * Math.PI;

    object.scale.setScalar(Math.random() + 0.5);

    object.castShadow = true;
    object.receiveShadow = true;

    group.add(object);

  }
}
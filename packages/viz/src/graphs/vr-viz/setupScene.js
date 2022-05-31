import * as THREE from 'three'
// import { Group } from 'three'
import {
  OrbitControls
} from 'three/examples/jsm/controls/OrbitControls.js'
import {
  XRControllerModelFactory
} from 'three/examples/jsm/webxr/XRControllerModelFactory.js'
import StatsVR from 'statsvr'
import setupSelections from './setupSelections.js'

let container
let camera, scene, renderer
let controller1, controller2
let controllerGrip1, controllerGrip2

const intersectables = []
// let getIntersectables = () => intersectables
let controls
let statsVR

const animateListeners = []

function subscribeTick (newListener) {
  animateListeners.push(newListener)
}

export function setupScene ({ debug = false } = {}) {
  init({ debug })
  animate()
  return {
    container,
    camera,
    scene,
    renderer,
    controller1,
    controller2,
    controllerGrip1,
    controllerGrip2,
    controls,
    subscribeTick
  }
}

// export function setupGraph ({ scene, graph, linesController, pointsController, subscribeTick }) {
//   const scale = 0.001
//   const group = new Group()
//   group.scale.set(scale, scale, scale)
//   group.position.set(0, 1.5, 0)
//   group.add(graph)
//   group.add(linesController.object)
//   group.add(pointsController.object)
//   scene.add(group)
//   subscribeTick(() => graph.tickFrame())
//   intersectables = graph.children.filter(child => child.__graphObjType === 'node')
//   return { graph }
// }

function init ({ debug }) {
  container = document.createElement('div')
  document.body.appendChild(container)

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x808080)

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.set(0, 1.6, 3)

  controls = new OrbitControls(camera, container)
  controls.target.set(0, 1.6, 0)
  controls.update()

  scene.add(new THREE.HemisphereLight(0x808080, 0x606060))

  const light = new THREE.DirectionalLight(0xffffff)
  light.position.set(0, 6, 0)
  light.castShadow = true
  light.shadow.camera.top = 2
  light.shadow.camera.bottom = -2
  light.shadow.camera.right = 2
  light.shadow.camera.left = -2
  light.shadow.mapSize.set(4096, 4096)
  scene.add(light)

  //

  renderer = new THREE.WebGLRenderer({
    antialias: true
  })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.outputEncoding = THREE.sRGBEncoding
  renderer.shadowMap.enabled = true
  renderer.xr.enabled = true
  container.appendChild(renderer.domElement)

  // controllers

  controller1 = renderer.xr.getController(0)
  scene.add(controller1)
  controller2 = renderer.xr.getController(1)
  scene.add(controller2)

  const controllerModelFactory = new XRControllerModelFactory()

  controllerGrip1 = renderer.xr.getControllerGrip(0)
  controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1))
  scene.add(controllerGrip1)
  controllerGrip2 = renderer.xr.getControllerGrip(1)
  controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2))
  scene.add(controllerGrip2)

  //

  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)])

  const line = new THREE.Line(geometry)
  line.name = 'line'
  line.scale.z = 5

  setupSelections({
    getIntersectables: () => intersectables,
    // onSelectStart = noop,
    // onSelectEnd = noop,
    controller1,
    controller2,
    subscribeTick
  })

  controller1.add(line.clone())
  controller2.add(line.clone())

  // fps monitor
  if (debug) {
    statsVR = new StatsVR(scene, camera)
    subscribeTick(() => statsVR.update())
  }

  window.addEventListener('resize', onWindowResize, false)
}

function onWindowResize () {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
}

//

function animate () {
  renderer.setAnimationLoop(render)
}

function render () {
  animateListeners.forEach((fn) => fn())
  renderer.render(scene, camera)
}

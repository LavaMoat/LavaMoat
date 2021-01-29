import * as THREE from 'three'
import {
  OrbitControls,
} from 'three/examples/jsm/controls/OrbitControls.js'
import {
  XRControllerModelFactory,
} from 'three/examples/jsm/webxr/XRControllerModelFactory.js'

let container
let camera, scene, renderer
let controller1, controller2
let controllerGrip1, controllerGrip2

let controls

const animateListeners = []

function subscribeTick (newListener) {
  animateListeners.push(newListener)
}

export default function setupScene () {
  init()
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
    subscribeTick,
  }
}

function init () {
  let geometry

  container = document.createElement('div')
  document.body.appendChild(container)

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x808080)

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.set(0, 1.6, 3)

  controls = new OrbitControls(camera, container)
  controls.target.set(0, 1.6, 0)
  controls.update()

  geometry = new THREE.PlaneBufferGeometry(4, 4)
  // const material = new THREE.MeshStandardMaterial({
  //   color: 0xeeeeee,
  //   roughness: 1.0,
  //   metalness: 0.0,
  // })
  // var floor = new THREE.Mesh(geometry, material);
  // floor.rotation.x = -Math.PI / 2;
  // floor.receiveShadow = true;
  // scene.add(floor);

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
    antialias: true,
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

  geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)])

  const line = new THREE.Line(geometry)
  line.name = 'line'
  line.scale.z = 5

  controller1.add(line.clone())
  controller2.add(line.clone())

  //

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

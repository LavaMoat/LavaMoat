import * as THREE from 'three'
import {
  OrbitControls
} from 'three/examples/jsm/controls/OrbitControls.js'
import {
  XRControllerModelFactory
} from 'three/examples/jsm/webxr/XRControllerModelFactory.js'
import StatsVR from 'statsvr'

let container
let camera, scene, renderer
let controller1, controller2
let controllerGrip1, controllerGrip2

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
    subscribeTick,
    setControllerText,
  }
}

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

  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)])
  const line = new THREE.Line(geometry)
  line.name = 'line'
  line.scale.z = 5
  controller1.add(line.clone())
  controller2.add(line.clone())

  const textMesh1 = createTextMesh('', { width: 800, height: 80, geoScale: 1/800 })
  controller1.add(textMesh1)
  textMesh1.position.y -= 0.15
  const textMesh2 = createTextMesh('', { width: 800, height: 80, geoScale: 1/800 })
  controller2.add(textMesh2)
  textMesh2.position.y -= 0.15

  // fps monitor
  if (debug) {
    statsVR = new StatsVR(scene, camera)
    subscribeTick(() => statsVR.update())
  }

  window.addEventListener('resize', onWindowResize, false)
}

function setControllerText (controller, text) {
  controller.getObjectByName('text').updateText(text)
}

function createTextMesh (text = '', opts = {}) {
  const { width = 200, height = 40, geoScale = 1/400 } = opts
  const textMesh = new THREE.Mesh(
    new THREE.PlaneGeometry( width * geoScale, height * geoScale ),
    new THREE.MeshBasicMaterial({
      map: createTextTexture(text)
    })
  );
  textMesh.name = 'text'

  textMesh.updateText = (text) => {
    textMesh.material.map = createTextTexture(text, opts)
  }

  return textMesh
}        

function createTextTexture (text = '', opts = {}) {
  const { width = 200, height = 40 } = opts
  const textCanvas = document.createElement( 'canvas' );
  textCanvas.width = width;
  textCanvas.height = height;
  const textContext = textCanvas.getContext( '2d' );
  textContext.fillStyle = '#000000';
  textContext.fillRect( 0, 0, textCanvas.width, textCanvas.height );
  textContext.fillStyle = '#FFFFFF';
  textContext.font = '14px sans-serif';
  textContext.fillText( text, 10, 30 );
  const textTexture = new THREE.CanvasTexture( textCanvas )
  return textTexture
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

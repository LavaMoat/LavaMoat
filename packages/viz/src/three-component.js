import React from 'react'
import * as THREE from 'three'
// import {
//   OrbitControls
// } from 'three/examples/jsm/controls/OrbitControls.js'

export default class ThreeComponent extends React.Component {
  constructor(props) {
    super(props)
    this.canvasRef = React.createRef()
    // this.scene = new THREE.Scene();

    // const { innerWidth, innerHeight } = window;
    // this.camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1000)
    // this.camera.position.set(0, 1.6, 3)

    // // this.controls = new OrbitControls(this.camera, this.canvasRef)
    // // this.controls.target.set(0, 1.6, 0)
    // // this.controls.update()

    // // geometry = new THREE.PlaneBufferGeometry(4, 4)
    // // const material = new THREE.MeshStandardMaterial({
    // //   color: 0xeeeeee,
    // //   roughness: 1.0,
    // //   metalness: 0.0,
    // // })
    // // var floor = new THREE.Mesh(geometry, material);
    // // floor.rotation.x = -Math.PI / 2;
    // // floor.receiveShadow = true;
    // // scene.add(floor);

    // this.scene.add(new THREE.HemisphereLight(0x808080, 0x606060))
    
    // this.renderer = new THREE.WebGLRenderer({
    //     canvas: this.canvas,
    //     antialias: false,
    // });
    // this.update = this.update.bind(this);
    // this.update()

  }

  // ******************* COMPONENT LIFECYCLE ******************* //
  componentDidMount() {
    // Get canvas, pass to custom class
    this.canvas = this.canvasRef.current

    var scene = new THREE.Scene()
    var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 )
    var renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
    })
    renderer.setSize( window.innerWidth, window.innerHeight )
    // var geometry = new THREE.BoxGeometry( 1, 1, 1 );
    // var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    // var cube = new THREE.Mesh( geometry, material );
    // scene.add( cube );
    camera.position.z = -5
    camera.lookAt(0, 0, 0)
    var animate = () => {
      requestAnimationFrame( animate )
      // cube.rotation.x += 0.01;
      // cube.rotation.y += 0.01;
      this.animate()
      renderer.render( scene, camera )
    }
    requestAnimationFrame( animate )

    this.scene = scene
    this.renderer = renderer
    this.camera = camera
    globalThis.scene = scene

    // Init any event listeners
    this.onMouseMove = this.onMouseMove.bind(this)
    window.addEventListener('mousemove', this.onMouseMove)
    this.onWindowResize = this.onWindowResize.bind(this)
    window.addEventListener('resize', this.onWindowResize)
  }

  componentDidUpdate(prevProps, prevState) {
    // Pass updated props to 
    const newValue = this.props.whateverProperty
    this.updateValue(newValue)
  }

  componentWillUnmount() {
    // Remove any event listeners
    window.removeEventListener('mousemove', () => this.onMouseMove)
    window.removeEventListener('resize', this.onWindowResize)
  }

  // ******************* EVENT LISTENERS ******************* //
  onMouseMove () {
    // Mouse moves
  }

  onWindowResize () {
    const { innerWidth, innerHeight } = window
    this.renderer.setSize(innerWidth, innerHeight)
  }

  updateValue (value) {
    // Whatever you need to do with React props
  }

  animate () {

  }
  // update(t) {
  //   this.renderer.render(this.scene, this.camera);
  //   requestAnimationFrame(this.update);
  // }

  render() {
    return (
      <div className="canvasContainer">
        <canvas ref={this.canvasRef} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
        }}/>
      </div>
    )
  }
}

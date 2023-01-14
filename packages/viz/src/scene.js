// import { Object3D } from 'three';
// import ThreeForceGraph from 'three-forcegraph'
import ThreeComponent from './three-component.js'
// import { PointsController } from './graphs/points-controller';
// import { LinesController } from './graphs/lines-controller';
// import { setupScene, setupGraph } from './graphs/vr-viz/setupScene.js'
import { FastThreeForceGraph } from './graphs/vr-viz/forcegraph.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export default class ScratchPad extends ThreeComponent {
  componentDidMount() {
    super.componentDidMount()

    // this.points = new PointsController()
    // this.lines = new LinesController()
    // this.scene.add(this.points.object)
    // this.scene.add(this.lines.object)

    // this.data = new Map()

    // const distance = 200;
    // for (let index = 0; index < 1000; index++) {
    //   const x = (Math.random() * 2 - 1) * distance
    //   const y = (Math.random() * 2 - 1) * distance
    //   // const z = distance + (Math.random() * 2 - 1) * distance
    //   // const x = Math.floor(index % 4) * distance / 10
    //   // const y = Math.floor(index / 4) * distance / 10
    //   const z = distance
    //   const position = [x,y,z]
    //   const color = [Math.random(), Math.random(), Math.random()]
    //   this.data.set(index, { color, position })
    //   this.points.update(index, 'position', position)
    //   this.points.update(index, 'color', color)
    //   if (index > 0) {
    //     const prevPoint = this.data.get(index - 1)
    //     this.lines.update(index, 'position', [...prevPoint.position, ...position])
    //   }
    // }

    const packageData = {
      nodes: [], links: [],
    }
    const colors = [
      'purple',
      'green',
      'orange',
      'brown',
      'red',
    ]

    for (let index = 0; index < 200; index++) {
      const node = {
        id: `${index}`,
        size: Math.random() * 2 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      }
      packageData.nodes.push(node)

      const offset = Math.floor(Math.random() * packageData.nodes.length)
      new Set(
        Array(3).fill()
          .map((_, index) => {
            return packageData.nodes[(offset + index) % packageData.nodes.length]
          })
          .filter(pair => pair.id !== node.id),
      ).forEach(pair => {
        const link = {
          id: `${node.id}-${pair.id}`,
          source: node.id,
          target: pair.id,
        }
        packageData.links.push(link)
      })

    }
    globalThis.packageData = packageData

    const graph = new FastThreeForceGraph({ graphData: packageData })
    this.graph = graph
    const scale = 0.1
    graph.scale.set(scale, scale, scale)   
    this.scene.add(graph)

    this.animateListeners = []
    const subscribeTick = (newListener) => {
      this.animateListeners.push(newListener)
    }
    subscribeTick(() => {
      graph.tickFrame()
    })

    const controls = new OrbitControls( this.camera, this.renderer.domElement )
    subscribeTick(() => {
      controls.update()
    })

    this.camera.position.set(0, 100, 3)
    this.camera.lookAt(0, 0, 0)

  }

  animate () {
    this.animateListeners.forEach(listener => listener())
  }

}

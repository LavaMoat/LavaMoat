// import { Object3D } from 'three';
// import ThreeForceGraph from 'three-forcegraph'
import ThreeComponent from './three-component';
// import { PointsController } from './graphs/points-controller';
// import { LinesController } from './graphs/lines-controller';
// import { setupScene, setupGraph } from './graphs/vr-viz/setupScene.js'
import { FastThreeForceGraph } from './graphs/vr-viz/forcegraph.js'

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
      nodes: [], links: []
    }

    for (let index = 0; index < 1000; index++) {
      const node = {
        id: `${index}`,
        size: 10,
      }
      packageData.nodes.push(node)

      const offset = Math.floor(Math.random() * packageData.nodes.length)
      new Set(
        Array(3).fill()
        .map((_, index) => {
          return packageData.nodes[(offset + index) % packageData.nodes.length]
        })
        .filter(pair => pair.id !== node.id)
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

    this.camera.position.set(0, 100, 3)
    this.camera.lookAt(0, 0, 0);
  }

  animate () {
    this.animateListeners.forEach(listener => listener())
    this.graph.scale.multiplyScalar(0.999)
    // for (let index = 0; index < 1000; index++) {
    //   const { color, position } = this.data.get(index)
    //   position[0] += (Math.random() * 2 - 1) * 0.5
    //   position[1] += (Math.random() * 2 - 1) * 0.5
    //   position[2] += (Math.random() * 2 - 1) * 0.5
    //   this.points.update(index, 'position', position)
    //   // this.points.update(index, 'color', [r, g, b])
    //   if (index > 0) {
    //     const prevPoint = this.data.get(index - 1)
    //     this.lines.update(index, 'position', [...prevPoint.position, ...position])
    //   }
    // }
  }

}

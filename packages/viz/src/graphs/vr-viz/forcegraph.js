import ThreeForceGraph from 'three-forcegraph'
// import SpriteText from 'three-spritetext';
import { Object3D, Group, SphereGeometry, Mesh } from 'three'
import { PointsController } from '../points-controller.js'
import { LinesController } from '../lines-controller.js'

export class FastThreeForceGraph extends Group {
  constructor ({ graphData = { node: [], links: [] }, nodeOpts = {}, linkOpts = {} } = {}) {
    super()

    const colorPallete = {
      purple: [0x80 / 255, 0, 0x80 / 255],
      green: [0, 0x80 / 255, 0],
      orange: [1, 0xa5 / 255, 0],
      brown: [0xa5 / 255, 0x2a / 255, 0x2a / 255],
      red: [1, 0, 0],
    }
    const linkCount = graphData.links.length
    const nodeCount = graphData.nodes.length
    this.linesController = new LinesController({ capacity: linkCount, ...linkOpts })
    this.pointsController = new PointsController({ capactiy: nodeCount, ...nodeOpts })

    const { linesController, pointsController } = this
    this.graph = new ThreeForceGraph()
      .graphData(graphData)
      .nodeThreeObject((node) => {
        pointsController.update(node.id, 'color', colorPallete[node.color] || colorPallete.purple)
        pointsController.update(node.id, 'size', [10 * node.size])
        // create dummy object, only used for collision
        const geometry = new SphereGeometry( 10 * node.size, 3, 2 )
        const collisionObject = new Mesh( geometry )
        collisionObject.name = node.id
        collisionObject.visible = false
        return collisionObject
      })
      .linkThreeObject((link) => {
        // create dummy object, only used to statisy ThreeForceGraph
        const dummyObject = new Object3D()
        dummyObject.visible = false
        return dummyObject
      })
      .linkPositionUpdate((linkObject, { start, end }, link) => {
        pointsController.update(link.source.id, 'translate', [link.source.x, link.source.y, link.source.z])
        pointsController.update(link.target.id, 'translate', [link.target.x, link.target.y, link.target.z])
        linesController.update(link.id, 'position', [start.x, start.y, start.z, end.x, end.y, end.z])
        // override link position update
        return true
      })
    
    this.graph.visible = false
    this.collisionObjects = this.graph.children


    this.add(this.graph)
    this.add(linesController.object)
    this.add(pointsController.object)
  }

  tickFrame () {
    this.graph.tickFrame()
  }

  getNodes () {
    return this.graph.children.filter(child => child.__graphObjType === 'node')
  }
}

import ThreeForceGraph from 'three-forcegraph'
// import SpriteText from 'three-spritetext';
import { Object3D, Group } from 'three'
import { PointsController } from '../points-controller'
import { LinesController } from '../lines-controller.js'

export class FastThreeForceGraph extends Group {
  constructor ({ graphData = { node: [], links: [] }, nodeOpts = {}, linkOpts = {} } = {}) {
    super()

    const linesController = new LinesController({ capacity: graphData.links.length, ...linkOpts })
    const pointsController = new PointsController({ capactiy: graphData.nodes.length, ...nodeOpts })
    this.graph = new ThreeForceGraph()
      .graphData(graphData)
    // .nodeVal('size')
      .nodeThreeObject((node) => {
        const colorPallete = {
          purple: [0x9b / 255, 0x59 / 255, 0xb6 / 255],
          green: [0x2e / 255, 0xcc / 255, 0x71 / 255],
          orange: [0xe6 / 255, 0x7e / 255, 0x22 / 255],
          brown: [0x9b / 255, 0x59 / 255, 0xb6 / 255],
          red: [0xe7 / 255, 0x4c / 255, 0x3c / 255]
        }
        pointsController.update(node.id, 'color', colorPallete[node.color] || colorPallete.purple)
        // create dummy object
        return new Object3D()
      // const sprite = new SpriteText('⬤', 12 * node.size, node.color);
      // sprite.material.depthTest = false;
      // return sprite
      })
    // .nodePositionUpdate((node) => {
    //   pointsController.update(node.id, 'position', [node.x, node.y, node.z])
    // })
      .linkThreeObject((link) => {
      // create dummy object
        return new Object3D()
      })
      .linkPositionUpdate((linkObject, { start, end }, link) => {
        pointsController.update(link.source.id, 'position', [link.source.x, link.source.y, link.source.z])
        pointsController.update(link.target.id, 'position', [link.target.x, link.target.y, link.target.z])
        linesController.update(link.id, 'position', [start.x, start.y, start.z, end.x, end.y, end.z])
        // override link position update
        return true
      })

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

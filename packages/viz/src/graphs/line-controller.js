import { LineSegments, LineBasicMaterial, BufferGeometry, Float32BufferAttribute } from 'three'

export class LineSegmentsController {
  constructor ({ lineCapacity = 1000, color = '#f0f0f0', opacity = 0.2 } = {}) {
    this.lineToIndex = new Map()
    this.material = new LineBasicMaterial({
      color,
      opacity,
      transparent: opacity < 1,
      depthWrite: opacity >= 1
    })
    this.geometry = new BufferGeometry()
    this.lineCapacity = 0
    this.vertices = new Float32Array(0)
    this.setLineCapacity(lineCapacity)
    this.object = new LineSegments(this.geometry, this.material)
    this.object.renderOrder = 10
  }

  setLine (id, start, end) {
    if (this.lineToIndex.has(id)) {
      const positions = this.geometry.attributes.position.array
      // existing line, update entry
      const index = this.lineToIndex.get(id)
      positions.set(start, index)
      positions.set(end, index + 3)
    } else {
      // new line, add new entry
      const lineCount = this.lineToIndex.size
      const index = lineCount * 2 * 3
      this.lineToIndex.set(id, index)
      // double line capacity if expired
      if (lineCount >= this.lineCapacity) {
        this.setLineCapacity(this.lineCapacity * 2)
      }
      const positions = this.geometry.attributes.position.array
      positions.set(start, index)
      positions.set(end, index + 3)
      this.geometry.setDrawRange(0, (lineCount + 1) * 2)
    }
    // mark for update
    this.geometry.attributes.position.needsUpdate = true
    // this.geometry.computeBoundingBox()
    // this.geometry.computeBoundingSphere()
  }

  setLineCapacity (newLineCapacity) {
    // lineCapacity * 2 point/line * 3 floats/point
    const newVertices = new Float32Array(newLineCapacity * 2 * 3)
    // only run this when its not the first time
    if (this.lineCapacity > 0) {
      const positions = this.geometry.attributes.position.array
      newVertices.set(positions)
    }
    this.vertices = newVertices
    this.geometry.setAttribute('position', new Float32BufferAttribute(this.vertices, 3))
    this.lineCapacity = newLineCapacity
  }
}

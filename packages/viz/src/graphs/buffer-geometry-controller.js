import { BufferGeometry, Float32BufferAttribute } from 'three'

export default class BufferGeometryController {
  constructor ({ capacity = 100, attributeSizes = {}, ...args } = {}) {
    this.idToIndex = new Map()
    this.material = this.createMaterial({ ...args })
    this.geometry = new BufferGeometry()
    this.capacity = 0
    this.object = this.createObject(this.geometry, this.material)
    this.attributeSizes = {
      position: [
        // number of values per vertex
        3,
        // number of vertices per item
        1
      ],
      ...attributeSizes
    }
    this.setCapacity(capacity)
  }

  update (id, attributeKey, value) {
    let index
    // get index for entry
    if (this.idToIndex.has(id)) {
      index = this.idToIndex.get(id)
    } else {
      index = this.createEntry(id)
    }
    // update attribute
    const attributeValue = this.geometry.attributes[attributeKey]
    const [length, count] = this.attributeSizes[attributeKey]
    const attributeIndex = index * length * count
    attributeValue.array.set(value, attributeIndex)
    attributeValue.needsUpdate = true
  }

  createEntry (id) {
    const itemCount = this.idToIndex.size
    const index = itemCount
    this.idToIndex.set(id, index)
    // double line capacity if expired
    if (itemCount >= this.capacity) {
      this.setCapacity(this.capacity * 2)
    }
    // draw range. check position attribute size to see if
    // we are counting indices or vertices
    const [_, count] = this.attributeSizes.position
    this.geometry.setDrawRange(0, (itemCount + 1) * count)
    return index
  }

  setCapacity (newCapacity) {
    for (const attributeKey in this.attributeSizes) {
      const [length, count] = this.attributeSizes[attributeKey]
      // size is capacity * length (number of floats per vertex) * count (number of vertices per item)
      const newAttributeValues = new Float32Array(newCapacity * length * count)
      // copy existing values
      const attribute = this.geometry.attributes[attributeKey]
      if (attribute !== undefined && attribute.array.length > 0) {
        newAttributeValues.set(attribute.array)
      }
      this.geometry.setAttribute(attributeKey, new Float32BufferAttribute(newAttributeValues, length))
    }
    this.capacity = newCapacity
  }
}

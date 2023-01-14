import { BufferGeometry, InstancedBufferGeometry, Float32BufferAttribute, InstancedBufferAttribute } from 'three'

export class BufferGeometryController {
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
        1,
      ],
      ...attributeSizes,
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
    // double capacity if exceeded
    if (itemCount >= this.capacity) {
      this.setCapacity(this.capacity * 2)
    }
    // update draw range. check position attribute size to see if
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

export class InstancedBufferGeometryController {
  constructor ({ capacity = 100, attributeSizes = {}, instancedAttributeSizes = {}, ...args } = {}) {
    this.idToIndex = new Map()
    this.material = this.createMaterial({ ...args })
    this.geometry = new InstancedBufferGeometry()
    this.capacity = 0
    this.object = this.createObject(this.geometry, this.material)
    this.attributeSizes = {
      position: [
        // number of values per vertex
        3,
        // number of vertices per item
        1,
      ],
      ...attributeSizes,
    }
    this.instancedAttributeSizes = {
      ...instancedAttributeSizes,
    }
    this.setCapacity(capacity)
  }

  updateAttribute (attributeKey, value) {
    // let index
    // // get index for entry
    // if (this.idToIndex.has(id)) {
    //   index = this.idToIndex.get(id)
    // } else {
    //   index = this.createEntry(id)
    // }
    // update attribute
    const attributeValue = this.geometry.attributes[attributeKey]
    // const [length, count] = this.attributeSizes[attributeKey]
    const attributeIndex = 0
    attributeValue.array.set(value, attributeIndex)
    attributeValue.needsUpdate = true
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
    const [length, count] = this.instancedAttributeSizes[attributeKey]
    const attributeIndex = index * length * count
    attributeValue.array.set(value, attributeIndex)
    attributeValue.needsUpdate = true
  }

  createEntry (id) {
    const itemCount = this.idToIndex.size
    const index = itemCount
    this.idToIndex.set(id, index)
    // double capacity if exceeded
    if (itemCount >= this.capacity) {
      this.setCapacity(this.capacity * 2)
    }
    // update draw range. check position attribute size to see if
    // we are counting indices or vertices
    const [_, count] = this.attributeSizes.position
    this.geometry.setDrawRange(0, (itemCount + 1) * count)
    return index
  }

  setCapacity (newCapacity) {
    for (const attributeKey in this.instancedAttributeSizes) {
      const [length, count] = this.instancedAttributeSizes[attributeKey]
      // size is capacity * length (number of floats per vertex) * count (number of vertices per item)
      const newAttributeValues = new Float32Array(newCapacity * length * count)
      // copy existing values
      const attribute = this.geometry.attributes[attributeKey]
      if (attribute !== undefined && attribute.array.length > 0) {
        newAttributeValues.set(attribute.array)
      }
      this.geometry.setAttribute(attributeKey, new InstancedBufferAttribute(newAttributeValues, length))
    }
    this.capacity = newCapacity
    console.log(this.geometry.instanceCount, this.geometry._maxInstanceCount)
    // seems like a bug that this needs to be set manually
    // this is set in `setupVertexAttributes` here https://github.com/mrdoob/three.js/blob/753020799d5463a8f0c74bad0bbe0448358190e4/src/renderers/webgl/WebGLBindingStates.js#L394
    // and unset in `onGeometryDispose` here https://github.com/mrdoob/three.js/blob/84f3e57c53357717d84234ccdb4f18be9d234025/src/renderers/webgl/WebGLGeometries.js#L42
    this.geometry._maxInstanceCount = newCapacity
  }
}

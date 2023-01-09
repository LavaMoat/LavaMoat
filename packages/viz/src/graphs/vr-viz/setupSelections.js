import { Raycaster, Matrix4 } from 'three'

const raycaster = new Raycaster()
const tempMatrix = new Matrix4()
/* eslint-disable-next-line no-empty-function */
const noop = () => {}

export function setupSelections ({
  getIntersectables = () => [],
  onSelectStart = noop,
  onSelectEnd = noop,
  onHoverStart = noop,
  onHoverEnd = noop,
  controller1,
  controller2,
  subscribeTick,
}) {
  controller1.addEventListener('selectstart', testSelectStart)
  controller1.addEventListener('selectend', testSelectEnd)
  controller2.addEventListener('selectstart', testSelectStart)
  controller2.addEventListener('selectend', testSelectEnd)
  subscribeTick(tickHandler)

  function tickHandler () {
    if (onHoverStart === noop && onHoverEnd === noop) {
      return
    }
    checkHover(controller1)
    checkHover(controller2)
  }

  function testSelectStart (event) {
    const controller = event.target
    const intersections = getIntersections(controller)
    if (intersections.length <= 0) {
      return
    }
    const [intersection] = intersections
    controller.userData.selected = intersection
    onSelectStart(intersection, controller)
  }

  function testSelectEnd (event) {
    const controller = event.target
    if (controller.userData.selected === undefined) {
      return
    }
    controller.userData.selected = undefined
    const intersections = getIntersections(controller)
    const [intersection] = intersections
    onSelectEnd(intersection, controller)
  }

  function getIntersections (controller) {
    tempMatrix.identity().extractRotation(controller.matrixWorld)
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix)
    return raycaster.intersectObjects(getIntersectables())
  }

  function checkHover (controller) {
    const line = controller.getObjectByName('line')
    const intersections = getIntersections(controller)
    const oldHover = controller.userData.hover
    let newHover
    if (intersections.length > 0) {
      // set new hover
      const [intersection] = intersections
      newHover = intersection
      line.scale.z = intersection.distance
      controller.userData.hover = intersection
    } else {
      controller.userData.hover = undefined
      line.scale.z = 5
    }
    // no change necesary
    if (oldHover === newHover) {
      return
    }
    // clear current hover
    if (oldHover !== undefined) {
      onHoverEnd(oldHover, controller)
    }
    // add new hover
    if (newHover !== undefined) {
      onHoverStart(newHover, controller)
    }
  }

}

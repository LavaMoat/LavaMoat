module.exports = makeGeneralUtils

function patchDocumentAccess(doc, node) {
  // apply patch only to DOM nodes
  const isInstanceOfNode = global?.window?.Node && node instanceof global?.window?.Node
  if (!isInstanceOfNode) {
    return
  }
  // apply patch only once
  const isAlreadyPatched = node.hasOwnProperty('ownerDocument')
  if (isAlreadyPatched) {
    return
  }
  // when ownerDocument prop is being accessed return proxy document instead of real document
  Object.defineProperty(node, 'ownerDocument', { get: () => doc })
}

function makeGeneralUtils () {
  return {
    createFunctionWrapper
  }

  function createFunctionWrapper (sourceValue, unwrapTest, unwrapTo) {
    const newValue = function (...args) {
      if (new.target) {
        // handle constructor calls
        return Reflect.construct(sourceValue, args, new.target)
      } else {
        // handle function calls
        // unwrap to target value if this value is the source package compartment's globalThis
        const thisRef = unwrapTest(this) ? unwrapTo : this
        const val = Reflect.apply(sourceValue, thisRef, args)
        patchDocumentAccess(this, val);
        return val
      }
    }
    Object.defineProperties(newValue, Object.getOwnPropertyDescriptors(sourceValue))
    return newValue
  }
}

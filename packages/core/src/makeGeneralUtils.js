module.exports = makeGeneralUtils

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
        return Reflect.apply(sourceValue, thisRef, args)
      }
    }
    Object.defineProperties(newValue, Object.getOwnPropertyDescriptors(sourceValue))
    return newValue
  }
}
module.exports = makeMagicCopy

function makeMagicCopy () {

  const copyCache = new WeakMap()

  return magicCopyCache

  function magicCopyCache (ref) {
    // use cache if hit
    if (copyCache.has(ref)) {
      return copyCache.get(ref)
    }
    // otherwise create copy
    const copy = magicCopyPrepareTarget(ref)
    // exit if copy is noop
    if (ref === copy) {
      return ref
    }
    return copy
  }

  function magicCopyPrepareTarget (ref) {
    // create a mutable copy
    switch (typeof ref) {
      case 'object':
        // return null as is
        if (ref === null) return ref
        // check if array or obj
        if (Array.isArray(ref)) {
          return magicCopyProps([], ref)
        } else {
          return magicCopyProps({}, ref)
        }
      case 'function':
        // supports both normal functions and both styles of classes
        const copy = function magicCopyFnWrapper (...args) {
          if (new.target) {
            return Reflect.construct(ref, args, new.target)
          } else {
            return Reflect.apply(ref, this, args)
          }
        }
        magicCopyProps(copy, ref)
        return copy
      default:
        // safe as is
        return ref
    }
  }

  function magicCopyProps (target, source) {
    // first populate cache with result
    // to prevent inf loops
    copyCache.set(source, target)
    // copy all props + prototype
    try {
      // copy props
      const props = Object.getOwnPropertyDescriptors(source)
      Object.entries(props).forEach(([key, desc]) => {
        if (!('value' in desc)) return
        props[key].value = magicCopyCache(desc.value)
      })
      Object.defineProperties(target, props)
      // copy prototype
      const origProto = Reflect.getPrototypeOf(source)
      const isPrimordial = [Function.prototype, Object.prototype, Array.prototype].includes(origProto)
      if (!isPrimordial) {
        const protoCopy = magicCopyCache(origProto)
        Reflect.setPrototypeOf(target, protoCopy)
      }
    } catch (err) {
      // console.warn('MagicCopy - Error performing copy:', err.message)
      throw err
    }
    return target
  }

}
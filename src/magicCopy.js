module.exports = makeMagicCopy

function makeMagicCopy () {

  return magicCopy

  function magicCopy (ref) {
    // create a mutable copy
    switch (typeof ref) {
      case 'object':
        // return null as is
        if (ref === null) return ref
        // check if array or obj
        if (Array.isArray(ref)) {
          return magicCopyInternal([], ref)
        } else {
          return magicCopyInternal({}, ref)
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
        magicCopyInternal(copy, ref)
        return copy
      default:
        // safe as is
        return ref
    }
  }

  function magicCopyInternal (target, source) {
    try {
      const props = Object.getOwnPropertyDescriptors(source)
      Object.defineProperties(target, props)
      const origProto = Reflect.getPrototypeOf(source)
      const protoCopy = magicCopy(origProto)
      Reflect.setPrototypeOf(target, protoCopy)
    } catch (err) {
      console.warn('Sesify - Error performing magic copy:', err.message)
      throw err
    }
    return target
  }

}
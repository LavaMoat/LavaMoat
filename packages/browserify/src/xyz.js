// const SES = require('ses')

// const realm = SES.makeSESRootRealm()

main()

// realm.evaluate(`
//   ${magicCopy}
//   ;(${main})()
// `, { console })

function main () {
  try {
    class MyClass {}

    MyClass.fromXyz = () => {}
    // MyClass.prototype.abc = () => 42

    class ClassCopy extends MyClass {}

    console.log('source', JSON.stringify(Object.getOwnPropertyDescriptors(MyClass), null, 2))
    console.log('target', JSON.stringify(Object.getOwnPropertyDescriptors(ClassCopy), null, 2))

    magicCopy(ClassCopy, MyClass)

    const result = ClassCopy
    console.log(result)
  } catch (err) {
    console.error(err)
  }
}

function magicCopy (target, source) {
  try {
    const props = Object.getOwnPropertyDescriptors(source)
    // cant override prototype
    // delete props.prototype
    Object.defineProperties(target, props)
  } catch (err) {
    console.warn('Sesify - Error performing magic copy:', err.message)
    throw err
  }
  return target
}
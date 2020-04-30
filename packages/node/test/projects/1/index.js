const { action, b, c } = require('a')

action()

console.log(`b value: ${b.value}`)
console.log(`c type: ${typeof c}`)
console.log(`c keys count: ${Object.keys(c).length}`)

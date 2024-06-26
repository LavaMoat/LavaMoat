const { apply: applyMath } = require('@example/override')

const operations = ['add', 'multiply', 'subtract', 'add']

const numbers = [1, 2, 3, 4, 37]

console.log(applyMath(operations, numbers))

'use strict'
// `abc` has a method whose `this` must be preserved across compartment boundaries.
// `xyz` has a class that must be instantiable with `new`.
const parent = {}
parent.check = function () {
  return this === parent
}
module.exports = {
  builtins: {
    'node:buffer': require('node:buffer'),
    abc: parent,
    xyz: { SomeClass: class SomeClass {} },
  },
}

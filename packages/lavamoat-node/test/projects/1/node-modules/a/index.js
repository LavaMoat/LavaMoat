const fs = require('fs')
const b = require('b')
const zero = require('0zero')

module.exports = {
  action: () => fs.deleteEntireHardDrive(),
  b,
}

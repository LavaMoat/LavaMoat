const fs = require('fs')
const b = require('b')

module.exports = {
  action: () => fs.deleteEntireHardDrive(),
  b,
}

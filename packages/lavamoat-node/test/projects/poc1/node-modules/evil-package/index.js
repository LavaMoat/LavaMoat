const fs = require('fs')
fs.writeFileSync(
  'poc.txt',
  'evil-package executed before LavaMoat denied the import\n'
)
module.exports = { initialized: true }

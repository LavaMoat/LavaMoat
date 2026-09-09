const { tmpdir } = require('os')
const fs = require('fs')
const tmp = tmpdir()
// relevant on mac
const tmpRealPath = fs.realpathSync(tmp)

// can write a file to tmp
fs.writeFileSync(`${tmpRealPath}/test.txt`, 'hello world')

// can read it back
fs.readFileSync(`${tmpRealPath}/test.txt`, 'utf8')

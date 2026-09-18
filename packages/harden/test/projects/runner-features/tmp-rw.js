const { tmpdir } = require('os')
const fs = require('fs')
const tmp = tmpdir()
const stats = fs.lstatSync(tmp)

// tempdir on mac is a symlink
let tmpRealPath = tmp
if (stats.isSymbolicLink()) {
  tmpRealPath = fs.readlinkSync(tmp)
}
// realpathSync fails when it iterates over all parents
// to resolve all links that could be involved in a path
// const tmpRealPath = fs.realpathSync(tmp)

// can write a file to tmp
fs.writeFileSync(`${tmpRealPath}/test.txt`, 'hello world')

// can read it back
fs.readFileSync(`${tmpRealPath}/test.txt`, 'utf8')

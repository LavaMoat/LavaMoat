const { platform } = require('node:os')

const isWindows = platform() === 'win32'

// https://github.com/nodejs/node/issues/38490
const fixWindowsExecPath = (inPath) =>
  '"' + inPath.replace(/"/g, '\\"') + '"'

module.exports = {
  fixWindowsExecPath,
  isWindows,
};

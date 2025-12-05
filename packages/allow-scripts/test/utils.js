const { platform } = require('node:os')

const isWindows = platform() === 'win32'

// https://github.com/nodejs/node/issues/38490
const fixWindowsExecPath = (inPath) =>
  '"' + inPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'

const portableExecPath = (inPath, debugLogging) => {
  if (!isWindows) {
    return inPath;
  }
  const portablePath = fixWindowsExecPath(inPath);
  if (debugLogging && inPath !== portablePath) {
    console.log(`@lavamoat/allow-scripts: transforming absolute path from ${inPath} to ${portablePath}`);
  }
  return portablePath;
}

module.exports = {
  fixWindowsExecPath,
  isWindows,
  portableExecPath,
};

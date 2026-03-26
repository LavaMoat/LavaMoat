if (process.platform === 'linux') {
  if (process.arch === 'x64') {
    throw new Error('Use ./linux-x64.js instead')
  } else if (process.arch === 'arm64') {
    throw new Error('Use ./linux-arm64.js instead')
  } else {
    throw new Error(`Unsupported architecture: ${process.arch}`)
  }
} else if (process.platform === 'darwin' && process.arch === 'arm64') {
  throw new Error('Use ./darwin-arm64.js instead')
} else if (process.platform === 'win32') {
  throw new Error('Use ./win32.js instead')
} else {
  throw new Error(
    `Unsupported platform/arch: ${process.platform}/${process.arch}`
  )
}

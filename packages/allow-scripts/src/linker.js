// @ts-check
// All of this is derived from the main functionality of bin-links that unfortunately would not allow for absolute path links
const { promises: fs } = require('fs')
const binTarget = require('bin-links/lib/bin-target.js')
const isWindows = require('bin-links/lib/is-windows.js')
const linkBin = isWindows ? require('bin-links/lib/shim-bin.js') : require('bin-links/lib/link-bin.js')


const { dirname, resolve, relative } = require('path')

const linkBinRelative = ({ path, bin, link, top = undefined, force = true }) => {
  const target = binTarget({ path, top })
  const to = resolve(target, bin)
  const absFrom = resolve(path, link)
  const from = relative(dirname(to), absFrom)
  return linkBin({ path, from, to, absFrom, force })
}

const linkBinAbsolute = ({ path, bin, link, top = undefined, force = true }) => {
  const target = binTarget({ path, top })
  const to = resolve(target, bin)
  const absFrom = link
  const from = link
  return linkBin({ path, from, to, absFrom, force })
}

module.exports = {
  linkBinRelative,
  linkBinAbsolute,
}

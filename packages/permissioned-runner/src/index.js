import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Build a self-contained yarn 4 plugin source string by inlining
 * `run-script-wrapper.js` into `yarn-plugin.cjs`: the `require()` call is
 * replaced with an IIFE around the wrapper source, with its `export` keyword
 * swapped for `return`.
 *
 * @returns {string}
 */
export function bundleYarnPlugin() {
  const dir = import.meta.dirname
  const adapterCode = readFileSync(join(dir, 'yarn-plugin.cjs'), 'utf-8')
  const wrapperCode = readFileSync(join(dir, 'run-script-wrapper.js'), 'utf-8')

  const inlined = `(() => {\n${wrapperCode.replace('export default ', 'return ')}\n})()`

  return adapterCode.replace(`require('./run-script-wrapper.js')`, inlined)
}

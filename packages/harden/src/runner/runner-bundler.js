import fs from 'node:fs'
import path from 'node:path'

const __dirname = import.meta.dirname

/**
 * @param {{ packageManager: string; fileName: string }} opts
 * @returns {string}
 */
export function bundleRunner({ packageManager, fileName }) {
  const adapterPath = path.join(__dirname, '..', packageManager, fileName)
  const adapterCode = fs.readFileSync(adapterPath, 'utf-8')

  const runScriptWrapperPath = path.join(__dirname, 'run-script-wrapper.cjs')
  const runScriptWrapperCode = fs.readFileSync(runScriptWrapperPath, 'utf-8')

  return `${adapterCode}\n;;\n${runScriptWrapperCode}`
}

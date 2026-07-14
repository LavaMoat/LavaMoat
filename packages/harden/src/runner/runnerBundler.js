import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const EXPORT_TO_REPLACE = 'module.exports = makeRunScriptWrapper'

/**
 * @param {{ packageManager: string; fileName: string }} opts
 * @returns {string}
 */
export function bundleRunner({ packageManager, fileName }) {
  const adapterPath = path.join(__dirname, '..', packageManager, fileName)
  const adapterCode = fs.readFileSync(adapterPath, 'utf-8')

  const runScriptWrapperPath = path.join(__dirname, 'runScriptWrapper.cjs')
  const runScriptWrapperCode = fs.readFileSync(runScriptWrapperPath, 'utf-8')

  if (!runScriptWrapperCode.includes(EXPORT_TO_REPLACE)) {
    throw new Error(
      `RunScriptWrapper file does not contain the required export statement or it was altered.`
    )
  }

  const modifiedRunScriptWrapperCode = runScriptWrapperCode.replace(
    EXPORT_TO_REPLACE,
    ''
  )

  return `${adapterCode}\n;;\n${modifiedRunScriptWrapperCode}`
}

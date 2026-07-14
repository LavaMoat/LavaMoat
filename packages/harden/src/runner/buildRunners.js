/**
 * Minimalistic build system for crunching out runners from the shared
 * runScriptWrapper code. All it does it take a fixed list of adapters and
 * concatenates runScriptWrapper at the end of each one.
 *
 * @module
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const IMPORT_TO_REPLACE =
  "const makeRunScriptWrapper = require('../runScriptWrapper.cjs')"

const EXPORT_TO_REPLACE = 'module.exports = makeRunScriptWrapper'

/**
 * @param {{ sourceDir: string; outputDir: string }} opts
 */
function build({ sourceDir, outputDir }) {
  // read filenames from adapters dir in sourceDir
  const adaptersDir = path.join(sourceDir, 'adapters')
  const adapterFiles = fs.readdirSync(adaptersDir)

  // read runScriptWrapper from sourceDir
  const runScriptWrapperPath = path.join(sourceDir, 'runScriptWrapper.cjs')
  const runScriptWrapperCode = fs.readFileSync(runScriptWrapperPath, 'utf-8')

  // for each adapter file, concatenate it with runScriptWrapper and write to outputDir
  for (const adapterFile of adapterFiles) {
    const adapterPath = path.join(adaptersDir, adapterFile)
    const adapterCode = fs.readFileSync(adapterPath, 'utf-8')
    if (!adapterCode.includes(IMPORT_TO_REPLACE)) {
      throw new Error(
        `Adapter file ${adapterFile} does not contain the required import statement.`
      )
    }
    const modifiedAdapterCode = adapterCode.replace(IMPORT_TO_REPLACE, '')
    if (!runScriptWrapperCode.includes(EXPORT_TO_REPLACE)) {
      throw new Error(
        `RunScriptWrapper file does not contain the required export statement.`
      )
    }
    const modifiedrunScriptWrapperCode = runScriptWrapperCode.replace(
      EXPORT_TO_REPLACE,
      ''
    )

    const outputCode = `${modifiedAdapterCode}\n;;\n${modifiedrunScriptWrapperCode}`
    const outputPath = path.join(outputDir, adapterFile)
    fs.writeFileSync(outputPath, outputCode, 'utf-8')
  }

  console.log(`Built ${adapterFiles.length} adapters to ${outputDir}`)
}

build({
  sourceDir: __dirname,
  outputDir: path.join(__dirname, '..', 'template', 'lavamoat'),
})

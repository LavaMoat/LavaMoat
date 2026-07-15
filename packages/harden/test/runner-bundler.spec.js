import test from 'ava'
import { bundleRunner } from '../src/runner/runnerBundler.js'

test('bundleRunner inlines wrapper into npm adapter', (t) => {
  const bundled = bundleRunner({
    packageManager: 'npm',
    fileName: 'runner.cjs',
  })

  t.true(bundled.includes('/* global makeRunScriptWrapper */'))
  t.true(
    bundled.includes("const { spawnSync } = require('node:child_process')")
  )
  t.true(bundled.includes('function makeRunScriptWrapper('))
  t.true(bundled.includes('\n;;\n'))
  t.false(bundled.includes('module.exports = makeRunScriptWrapper'))
})

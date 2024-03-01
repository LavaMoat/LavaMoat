import 'ses'

import test from 'ava'
import stringify from 'json-stable-stringify'
import { loadCompartmentMap } from '../../src/policy-gen/index.js'
import { PolicyGenerator } from '../../src/policy-gen/policy-generator.js'
import { loadJSONFixture } from '../fixture-util.js'

test('buildModuleRecords() - result is deterministic', async (t) => {
  const { readPowers } = await loadJSONFixture(
    new URL('../fixture/json/kitchen-sink.json', import.meta.url)
  )

  const { compartmentMap, sources, renames } = await loadCompartmentMap(
    '/index.js',
    { readPowers }
  )
  const generator = PolicyGenerator.create(compartmentMap, sources, renames, {
    readPowers,
  })
  const moduleRecords = await generator.buildModuleRecords()

  t.snapshot(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    stringify(moduleRecords.map(({ content, ...record }) => record))
  )
})

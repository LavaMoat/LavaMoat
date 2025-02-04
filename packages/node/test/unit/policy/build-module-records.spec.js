import '../../../src/preamble.js'

import test from 'ava'
import stringify from 'json-stable-stringify'
import { loadCompartmentMap } from '../../../src/policy-gen/policy-gen-compartment-map.js'
import { buildModuleRecords } from '../../../src/policy-gen/to-policy.js'
import { JSON_FIXTURE_DIR_URL, loadJSONFixture } from '../json-fixture-util.js'

test('buildModuleRecords() is deterministic', async (t) => {
  const { readPowers } = await loadJSONFixture(
    new URL('./kitchen-sink.json', JSON_FIXTURE_DIR_URL)
  )

  const { compartmentMap, sources, renames } = await loadCompartmentMap(
    '/index.js',
    { readPowers }
  )
  const moduleRecords = buildModuleRecords(compartmentMap, sources, renames, {
    readPowers,
  })

  // strip content
  t.snapshot(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    stringify(moduleRecords.map(({ content, ...record }) => record))
  )
})

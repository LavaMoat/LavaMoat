import 'ses'

import test from 'ava'
import stringify from 'json-stable-stringify'
import { loadCompartmentMap } from '../../src/compartment-map.js'
import { buildModuleRecords } from '../../src/policy-gen/to-policy.js'
import { loadJSONFixture } from '../fixture-util.js'

test('buildModuleRecords() - result is deterministic', async (t) => {
  const { readPowers } = await loadJSONFixture(
    new URL('../fixture/json/kitchen-sink.json', import.meta.url)
  )

  const { compartmentMap, sources, renames } = await loadCompartmentMap(
    '/index.js',
    { readPowers }
  )
  const moduleRecords = await buildModuleRecords(
    compartmentMap,
    sources,
    renames,
    readPowers
  )

  t.snapshot(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    stringify(moduleRecords.map(({ content, ...record }) => record))
  )
})

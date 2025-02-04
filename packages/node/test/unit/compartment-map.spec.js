import '../../src/preamble.js'

import test from 'ava'
import { loadCompartmentMap } from '../../src/policy-gen/policy-gen-compartment-map.js'
import { JSON_FIXTURE_DIR_URL, loadJSONFixture } from './json-fixture-util.js'

test('compartment map is deterministic', async (t) => {
  const { readPowers } = await loadJSONFixture(
    new URL('./kitchen-sink.json', JSON_FIXTURE_DIR_URL)
  )

  const result = await loadCompartmentMap('/index.js', {
    readPowers,
  })

  t.snapshot(result)
})

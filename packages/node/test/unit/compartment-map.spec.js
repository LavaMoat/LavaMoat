import '../../src/preamble.js'

import test from 'ava'
import stringify from 'json-stable-stringify'
import { DEFAULT_TRUST_ROOT_COMPARTMENT } from '../../src/constants.js'
import { loadCompartmentMap } from '../../src/policy-gen/policy-gen-compartment-map.js'
import { JSON_FIXTURE_DIR_URL, loadJSONFixture } from './json-fixture-util.js'

test('compartment map is deterministic', async (t) => {
  const { readPowers } = await loadJSONFixture(
    new URL('./kitchen-sink.json', JSON_FIXTURE_DIR_URL)
  )

  const { compartmentMap, renames } = await loadCompartmentMap('/index.js', {
    readPowers,
    trustRoot: DEFAULT_TRUST_ROOT_COMPARTMENT,
  })

  t.snapshot(
    JSON.parse(/** @type {string} */ (stringify({ compartmentMap, renames })))
  )
})

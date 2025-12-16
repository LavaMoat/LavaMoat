import '../../../src/preamble.js'

import test from 'ava'
import { DEFAULT_TRUST_ROOT_COMPARTMENT } from '../../../src/constants.js'
import { loadAndGeneratePolicy } from '../../../src/policy-gen/load-for-policy.js'
import {
  DEFAULT_JSON_FIXTURE_ENTRY_POINT,
  JSON_FIXTURE_DIR_URL,
  loadJSONFixture,
} from '../json-fixture-util.js'

test('result is deterministic for trusted root', async (t) => {
  const { readPowers } = await loadJSONFixture(
    new URL('./kitchen-sink.json', JSON_FIXTURE_DIR_URL)
  )

  const { policy } = await loadAndGeneratePolicy(
    DEFAULT_JSON_FIXTURE_ENTRY_POINT,
    {
      readPowers,
      trustRoot: DEFAULT_TRUST_ROOT_COMPARTMENT,
    }
  )

  t.snapshot(policy)
})

test('result is deterministic for untrusted root', async (t) => {
  const { readPowers } = await loadJSONFixture(
    new URL('./kitchen-sink.json', JSON_FIXTURE_DIR_URL)
  )

  const { policy } = await loadAndGeneratePolicy(
    DEFAULT_JSON_FIXTURE_ENTRY_POINT,
    {
      readPowers,
      trustRoot: false,
    }
  )

  t.snapshot(policy)
})

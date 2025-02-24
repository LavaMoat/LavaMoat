import '../../src/preamble.js'

import test from 'ava'
import { generatePolicy } from '../../src/policy-gen/generate.js'
import { JSON_FIXTURE_DIR_URL, loadJSONFixture } from './json-fixture-util.js'

test.only('policy from compartment map is stable', async (t) => {
  const { readPowers } = await loadJSONFixture(
    new URL('./kitchen-sink.json', JSON_FIXTURE_DIR_URL)
  )

  const policy = await generatePolicy('/index.js', {
    readPowers,
    write: false,
  })

  // @ts-expect-error I refuse to deal with this further, we must change resources to be a required field.
  t.assert(Object.keys(policy.resources).some((key) => key.includes('>')))

  t.snapshot(policy)
})

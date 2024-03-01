import 'ses'

import test from 'ava'
import { loadCompartmentMap } from '../../src/policy-gen/index.js'
import { loadJSONFixture } from '../fixture-util.js'

test('compartment map is deterministic', async (t) => {
  const { readPowers } = await loadJSONFixture(
    new URL('../fixture/json/kitchen-sink.json', import.meta.url)
  )

  const result = await loadCompartmentMap('/index.js', {
    readPowers,
  })

  t.snapshot(result)
})

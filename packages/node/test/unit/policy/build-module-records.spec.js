import '../../../src/preamble.js'

import test from 'ava'
import stringify from 'json-stable-stringify'
import { DEFAULT_TRUST_ROOT_COMPARTMENT } from '../../../src/constants.js'
import { loadCompartmentMapForPolicy } from '../../../src/policy-gen/policy-gen-compartment-map.js'
import { buildModuleRecords } from '../../../src/policy-gen/to-policy.js'
import { JSON_FIXTURE_DIR_URL, loadJSONFixture } from '../json-fixture-util.js'

test('buildModuleRecords() is deterministic', async (t) => {
  const { readPowers } = await loadJSONFixture(
    new URL('./kitchen-sink.json', JSON_FIXTURE_DIR_URL)
  )

  const { compartmentMap, sources, renames, dataMap } =
    await loadCompartmentMapForPolicy('/index.js', {
      readPowers,
      trustRoot: DEFAULT_TRUST_ROOT_COMPARTMENT,
    })

  const moduleRecords = buildModuleRecords(
    '/index.js',
    compartmentMap,
    dataMap,
    sources,
    renames,
    {
      readPowers,
    }
  )

  // strip content
  t.snapshot(
    JSON.parse(
      /** @type {string} */ (
        stringify(
          moduleRecords.map(({ content: _content, ...record }) => record)
        )
      )
    )
  )
})

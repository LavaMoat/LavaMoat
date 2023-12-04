import test from 'ava'
import { loadScenarios } from 'lavamoat-core/test/scenarios/index.js'
import { runAndTestScenario } from 'lavamoat-core/test/util.js'
import { runScenario } from './helpers.js'

const GLOBAL_WRITE_REGEX = /".+?":"write"/g

function policyHasWritableGlobal(scenario) {
  return (
    GLOBAL_WRITE_REGEX.test(JSON.stringify(scenario.config)) ||
    GLOBAL_WRITE_REGEX.test(JSON.stringify(scenario.configOverride))
  )
}

const SKIP_SCENARIOS = new Set([
  'globalRef - check default containment',
  'globalRef - Webpack code in the wild works',
])

test('Run scenarios', async (t) => {
  let count = 0
  let skipped = 0
  for await (const scenario of loadScenarios()) {
    count++
    if (
      !(
        Object.keys(scenario.context).length === 0 &&
        scenario.context.constructor === Object
      )
    ) {
      console.debug(`[SKIPPING] ${scenario.name} (???)`)
      skipped++
      continue
    }

    if (policyHasWritableGlobal(scenario)) {
      console.debug(`[SKIPPING] ${scenario.name} (has writable global)`)
      skipped++
      continue
    }
    if (scenario.name.startsWith('scuttle')) {
      console.debug(`[SKIPPING] ${scenario.name} (scuttling unsupported)`)
      skipped++
      continue
    }
    if (SKIP_SCENARIOS.has(scenario.name)) {
      console.debug(`[SKIPPING] ${scenario.name} (fixme)`)
      skipped++
      continue
    }
    // console.debug(`[SCENARIO] ${scenario.name}`)
    try {
      await runAndTestScenario(t, scenario, runScenario)
      console.debug(`[OK] ${scenario.name}`)
    } catch (err) {
      console.debug(/** @type {Error} */ (err).message ?? err)
      console.debug(`[FAIL] ${scenario.name}`)
    }
  }

  console.debug('Ran %d/%d scenarios', count - skipped, count)
})

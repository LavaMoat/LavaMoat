/**
 * This script generates a policy for endomoat itself. This is needed to allow
 * the default attenuator to execute.
 *
 * The result of this is merged into the user-provided policy (or policies)
 * during conversion to an Endo policy. Because the Endo policy is not
 * persisted, making changes in endomoat won't break existing policies.
 *
 * By persisting the policy to disk, we tradeoff initial execution time for
 * needing to update the policy before release. Is this a good idea? I don't
 * know.
 *
 * @packageDocumentation
 */

import { fileURLToPath } from 'node:url'
import { generateAndWritePolicy } from '../src/index.js'

const PHONY_ENTRYPOINT = new URL('./use-self/index.js', import.meta.url)

const POLICY_OVERRIDE_PATH = fileURLToPath(
  new URL('../src/policy-override.json', import.meta.url)
)

generateAndWritePolicy(PHONY_ENTRYPOINT, {
  policyPath: POLICY_OVERRIDE_PATH,
}).then(() => {
  console.error('Wrote %s', POLICY_OVERRIDE_PATH)
})

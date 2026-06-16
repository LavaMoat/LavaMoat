import test from 'ava'
import { mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { applyOpinions } from '../src/tools/apply-opinions.js'

/**
 * @param {string} cwd
 */
function createFacts(cwd) {
  return {
    cwd,
    packageJson: null,
    packageManagerField: null,
    hasPackageLock: false,
    lockfileVersion: null,
    hasNpmrc: false,
    hasYarnLock: false,
    hasYarnrc: false,
    hasYarnrcYml: false,
    yarnNodeLinker: null,
    hasYarnState: false,
    hasPnpmLock: false,
    hasPnpmWorkspace: false,
    directGitDeps: [],
  }
}

test('applyOpinions deduplicates and forwards recommended commands', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'harden-followup-dedupe-'))
  const seen = []

  await applyOpinions(
    [
      {
        description: 'first',
        execute: async () => [],
        recommendCommands: ['npm approve-scripts', 'npm run lint'],
      },
      {
        description: 'second',
        execute: async () => [],
        recommendCommands: ['npm approve-scripts'],
      },
    ],
    createFacts(cwd),
    {
      async shouldApplyOpinion() {
        return true
      },
      async shouldFollowupCommand(command) {
        seen.push(command)
        return false
      },
    }
  )

  t.deepEqual(seen, ['npm approve-scripts', 'npm run lint'])
})

import { applyLatestVersion } from '../tools/versions.js'
import { promisify } from 'node:util'
import child_process from 'node:child_process'
const execFile = promisify(child_process.execFile)
/** @import {Opinion} from "../tools/types.js" */

/** @type {readonly Opinion[]} */
export const opinions = Object.freeze([
  {
    description:
      'Set a minimum release age to avoid installing recently-published (potentially malicious) packages.',
    level: 'moderate',
    changes: [
      {
        target: 'pnpm-workspace.yaml',
        key: 'minimumReleaseAge',
        value: 4320,
        comment:
          'Avoid installing packages published in last 3 days (in minutes).',
      },
    ],
  },

  {
    description:
      'Enforce minimum pnpm version via packageManager field in package.json.',
    level: 'baseline',
    changes: [
      {
        target: 'package.json',
        key: 'packageManager',
        value: 'pnpm@11.0.0',
        ifNotExist: true,
      },
    ],
    execute: async (changes, facts) => {
      try {
        // eslint-disable-next-line n/no-unsupported-features/node-builtins
        const response = await fetch(`https://registry.npmjs.org/pnpm/latest`)

        const packument = /** @type {{ version: string }} */ (
          await response.json()
        )
        return applyLatestVersion(changes, facts, packument.version)
      } catch (err) {
        console.error(`    Failed to fetch latest pnpm version: ${err}`)
      }
    },
  },

  {
    description:
      'Disable exotic subdeps in older pnpm versions in case someone failed to update.',
    level: 'paranoid',
    changes: [
      {
        target: 'pnpm-workspace.yaml',
        key: 'blockExoticSubdeps',
        value: true,
        comment: 'Disable exotic subdeps in older pnpm versions.',
      },
    ],
  },

  {
    description:
      'Prevent npm from being used in case someone accidentally runs an old version of it.',
    level: 'paranoid',
    changes: [
      {
        target: '.npmrc',
        key: 'offline',
        value: true,
        comment: 'Make using npm impossible.',
      },
      {
        target: '.npmrc',
        key: 'ignore-scripts',
        value: true,
        comment: 'Ignore scripts just in case.',
      },
    ],
  },

  {
    description: 'Enable trust policy in pnpm to detect provenance downgrades.',
    level: 'moderate',
    changes: [
      {
        target: 'pnpm-workspace.yaml',
        key: 'trustPolicy',
        value: 'no-downgrade',
        comment:
          'Fail if trusted publishing or provenance is gone from a package that used to have it.',
      },
    ],
  },

  {
    description: 'Set up allowBuilds config for lifecycle scripts.',
    level: 'baseline',
    execute: async (changes, facts, askToHarden) => {
      const approveAll = !(await askToHarden(
        {
          description:
            'Skip approving all builds as initial state, will need interactive approval later.',
        },
        facts
      ))

      if (approveAll) {
        try {
          await execFile('pnpm', ['approve-builds', '--all'], {
            cwd: facts.cwd,
          })
          console.log(
            `Approved all pending builds. Review allowBuilds in pnpm-workspace.yaml and remove entries you don't need.`
          )
        } catch (err) {
          console.error(`Failed to execute pnpm approve-builds --all`, err)
        }
      } else {
        console.log(
          `Run 'pnpm approve-builds' to interactively approve or deny lifecycle scripts.`
        )
      }
    },
  },
])

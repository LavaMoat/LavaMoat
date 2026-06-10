import { applyLatestVersion } from '../tools/versions.js'
/** @import {Opinion} from "../tools/types.js" */

/** @type {readonly Opinion[]} */
export const opinions = Object.freeze([
  {
    description:
      'Set a minimum release age to avoid installing recently-published (potentially malicious) packages.',
    level: 'moderate',
    changes: [
      {
        target: 'config',
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
        target: 'config',
        key: 'blockExoticSubdeps',
        value: true,
        comment: 'Disable exotic subdeps in older pnpm versions.',
      },
    ],
  },

  {
    description: 'Enable trust policy in pnpm to detect provenance downgrades.',
    level: 'moderate',
    changes: [
      {
        target: 'config',
        key: 'trustPolicy',
        value: 'no-downgrade',
        comment:
          'Fail if trusted publishing or provenance is gone from a package that used to have it.',
      },
    ],
  },
])

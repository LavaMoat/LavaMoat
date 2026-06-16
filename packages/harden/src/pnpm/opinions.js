import { applyLatestVersion } from '../tools/versions.js'
import { buildAllowlistChanges } from './build-allowlist.js'
/** @import {Opinion} from "../tools/types.js" */

/** @type {readonly Opinion[]} */
const definedOpinions = [
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
    execute: async (changes, facts, decisions, print) => {
      try {
        // eslint-disable-next-line n/no-unsupported-features/node-builtins
        const response = await fetch(`https://registry.npmjs.org/pnpm/latest`)

        const packument = /** @type {{ version: string }} */ (
          await response.json()
        )
        return applyLatestVersion(changes, facts, packument.version)
      } catch (err) {
        print(Error(`    Failed to fetch latest pnpm version: ${err}`))
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
      'Allow running lifecycle scripts only for explicitly allowlisted packages, and ask the user to approve the existing ones if any.',
    level: 'baseline',
    execute: async (changes, facts, decisions, print) => {
      const allowlistChanges = await buildAllowlistChanges(
        facts,
        decisions,
        print
      )
      return [...allowlistChanges]
    },
    recommendCommands: ['pnpm approve-scripts'],
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
    description:
      'Take over pnpm run and remove bin scripts confusion possibility and limit env variables exposure to the shell running the scripts.',
    level: 'paranoid',
    changes: [
      {
        target: '/lavamoat',
        key: '.runner.js',
        value: null,
      },
      {
        target: '/lavamoat',
        key: '.env.ban.json',
        value: null,
      },
      {
        target: 'pnpm-workspace.yaml',
        key: 'scriptShell',
        value: './lavamoat/.runner.js',
        comment: 'Protect the runtime of calls to pnpm run ',
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
]

export const opinions = Object.freeze(definedOpinions)

/** @import {Opinion} from "../tools/types.js" */
import { applyLatestVersion } from '../tools/versions.js'

/** @type {readonly Opinion[]} */
export const opinions = Object.freeze([
  {
    description:
      'Disable lifecycle scripts by default to prevent malicious code execution on install.',
    level: 'baseline',
    changes: [
      {
        target: '.yarnrc.yml',
        key: 'enableScripts',
        value: false,
        comment: "Don't run lifecycle scripts by default.",
      },
    ],
  },

  {
    description:
      'Set a minimum release age to avoid installing recently-published (potentially malicious) packages.',
    level: 'moderate',
    changes: [
      {
        target: '.yarnrc.yml',
        key: 'npmMinimalAgeGate',
        value: 4320,
        comment:
          'Avoid installing packages published in last 3 days (in minutes).',
      },
    ],
  },

  {
    description:
      'Block git dependencies which can bypass release age and script controls.',
    level: 'baseline',
    changes: [
      {
        target: '.yarnrc.yml',
        key: 'approvedGitRepositories',
        value: [],
        comment: 'Allowlist of git dependencies. Empty to block all.',
      },
    ],
    execute: async (changes, facts) => {
      if (facts.directGitDeps.length > 0) {
        // TODO: the way git deps are specified is not exactly the same as the way the allowlist works, so it should need editing. We could implement processing them to create proper allowlist entries.
        console.warn(
          `Found git dependencies in package.json. Edit approvedGitRepositories in .yarnrc.yml accordingly.`
        )
        changes[0].value = facts.directGitDeps
      }
    },
  },

  {
    description:
      'Enforce minimum yarn version via packageManager field in package.json.',
    level: 'moderate',
    changes: [
      {
        target: 'package.json',
        key: 'packageManager',
        value: 'yarn@4.15.0',
        ifNotExist: true,
      },
    ],
    execute: async (changes, facts) => {
      try {
        // eslint-disable-next-line n/no-unsupported-features/node-builtins
        const response = await fetch(`https://repo.yarnpkg.com/tags`)

        const tags = /** @type {{ latest: { stable: string } }} */ (
          await response.json()
        )
        return applyLatestVersion(changes, facts, tags.latest.stable)
      } catch (err) {
        console.error(`    Failed to fetch latest yarn version: ${err}`)
      }
    },
  },

  {
    description:
      'Disable global cache in yarn to avoid cross-project cache poisoning.',
    level: 'paranoid',
    changes: [
      {
        target: '.yarnrc.yml',
        key: 'enableGlobalCache',
        value: false,
        comment: 'Disable global cache to avoid cross-project poisoning.',
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
    description:
      'Prevent yarn1 from running scripts in case someone accidentally uses it before setting up.',
    level: 'paranoid',
    changes: [
      {
        target: '.yarnrc',
        key: 'ignore-scripts',
        value: true,
        comment: 'Ignore scripts in case yarn1 is accidentally used.',
      },
    ],
  },
])

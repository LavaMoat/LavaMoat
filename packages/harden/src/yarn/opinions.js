/** @import {Opinion} from "../tools/types.js" */
import { applyLatestVersion } from '../tools/versions.js'
import { buildAllowlistChanges } from './yarn-build-allowlist.js'
import { buildAllowlistChanges as buildLmAllowlistChanges } from './lm-build-allowlist.js'

/** @type {readonly Opinion[]} */
const definedOpinions = [
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
      'Enforce minimum yarn version via packageManager field in package.json.',
    level: 'baseline',
    changes: [
      {
        target: 'package.json',
        key: 'packageManager',
        value: 'yarn@4.16.0',
        ifNotExist: true,
      },
      {
        target: 'package.json',
        key: 'devEngines',
        value: {
          packageManager: {
            name: 'yarn',
            version: '>=4.16.0',
            onFail: 'error',
          },
        },
      },
    ],
    execute: async (changes, facts, decisions, print) => {
      if (
        await decisions.askToHarden(
          {
            description: 'Force yarn to be at the latest stable version',
            level: 'moderate',
          },
          facts
        )
      ) {
        try {
          // eslint-disable-next-line n/no-unsupported-features/node-builtins
          const response = await fetch(`https://repo.yarnpkg.com/tags`)

          const tags = /** @type {{ latest: { stable: string } }} */ (
            await response.json()
          )
          return applyLatestVersion(changes, facts, tags.latest.stable)
        } catch (err) {
          print(Error(`    Failed to fetch latest yarn version: ${err}`))
        }
      }
    },
  },

  {
    description: `Choose whether to use yarn's built-in handling of dependenciesMeta to allow specific lifecycle scripts without the ability to control versions and duplicates of the same name, or to use @lavamoat/allow-scripts to manage script permissions.`,
    level: 'baseline',
    alternatives: [
      {
        description:
          'Use dependenciesMeta in package.json. This is simpler but less flexible and may cause issues with duplicates and version mismatches.',
        level: 'baseline',
        changes: [
          {
            target: 'package.json',
            key: 'dependenciesMeta',
            value: {},
            comment:
              'List of packages with lifecycle scripts that are allowed to run.',
          },
        ],
        execute: async (changes, facts, decisions, print) => {
          const allowlistChanges = await buildAllowlistChanges(
            facts,
            decisions,
            print
          )
          if (allowlistChanges.length > 0) {
            return allowlistChanges
          } else {
            return changes
          }
        },
        recommendCommands: ['yarn install'],
      },
      {
        description:
          'Use @lavamoat/allow-scripts to manage script permissions. This is more complex but allows precise control over which scripts are allowed to run.',
        level: 'paranoid',
        changes: [
          {
            target: 'package.json',
            key: 'allowScripts',
            value: {},
            comment:
              'List of lifecycle scripts that are allowed to run, managed by @lavamoat/allow-scripts.',
          },
        ],
        execute: async (changes, facts, decisions, print) => {
          const result = await buildLmAllowlistChanges(facts, decisions, print)
          return result.length > 0 ? result : changes
        },
        recommendCommands: ['yarn install', 'yarn allow-scripts auto'],
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
    execute: async (changes, facts, decisions, print) => {
      if (facts.directGitDeps.length > 0) {
        // TODO: the way git deps are specified is not exactly the same as the way the allowlist works, so it should need editing. We could implement processing them to create proper allowlist entries.
        print(
          `Found git dependencies in package.json. Edit approvedGitRepositories in .yarnrc.yml accordingly.`
        )
        changes[0].value = facts.directGitDeps
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
]

export const opinions = Object.freeze(definedOpinions)

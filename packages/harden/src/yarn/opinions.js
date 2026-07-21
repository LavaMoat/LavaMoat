/** @import {Opinion} from "../tools/types.js" */
import { applyLatestVersion, assertDevEngines } from '../tools/versions.js'
import { buildAllowlistChanges } from './yarn-build-allowlist.js'
import { buildAllowlistChanges as buildLmAllowlistChanges } from './lm-build-allowlist.js'
import { bundleRunner } from '../runner/runnerBundler.js'

/** @type {readonly Opinion[]} */
const definedOpinions = [
  {
    id: 'y_scripts',
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
    id: 'y_engines',
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
            id: 'y_latest',
            description: 'Force yarn to be at the latest stable version',
            level: 'paranoid',
          },
          facts
        )
      ) {
        try {
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
    verify: async (changes, _results, facts) =>
      assertDevEngines({
        actual: /** @type {any} */ (facts.packageJson)?.devEngines,
        expected: changes[1].value,
      }),
  },

  {
    id: 'y_allowlist',
    description: `Choose whether to use yarn's built-in handling of dependenciesMeta to allow specific lifecycle scripts without the ability to control versions and duplicates of the same name, or to use @lavamoat/allow-scripts to manage script permissions.`,
    level: 'baseline',
    alternatives: [
      {
        id: 'y_meta',
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
        verify: async (changes, results, facts) => {
          // check if package.json has dependenciesMeta set at all
          return facts.packageJson?.dependenciesMeta !== undefined
        },
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
        id: 'y_lavamoat',
        description:
          'Use @lavamoat/allow-scripts to manage script permissions. This is more complex but allows precise control over which scripts are allowed to run.',
        level: 'paranoid',
        changes: [
          {
            target: 'package.json',
            key: ['lavamoat', 'allowScripts'],
            value: {},
            comment:
              'List of lifecycle scripts that are allowed to run, managed by @lavamoat/allow-scripts.',
          },
        ],
        verify: async (changes, results, facts) => {
          // check if package.json has allowScripts set at all
          return (
            results.length === 0 &&
            facts.packageJson?.devDependencies?.['@lavamoat/allow-scripts'] !==
              undefined
          )
        },
        execute: async (changes, facts, decisions, print) => {
          const result = await buildLmAllowlistChanges(facts, decisions, print)
          return result.length > 0 ? result : changes
        },
        recommendCommands: ['yarn install', 'yarn allow-scripts auto'],
      },
    ],
  },

  {
    id: 'y_age',
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
    id: 'y_git',
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
    verify: async (changes, results, _facts) => {
      return results.length === 0
    },
  },

  {
    id: 'y_nocache',
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
    id: 'y_runner',
    description:
      'Take over yarn run and remove bin scripts confusion possibility and configure other limitations.',
    level: 'paranoid',
    changes: [
      {
        target: '/lavamoat',
        key: '.runner-plugin.js',
        value: bundleRunner({
          packageManager: 'yarn',
          fileName: 'runner-plugin.js',
        }),
      },
    ],
    verify: async (changes, results, _facts) => {
      // not verifying any of the customizations
      return results.length === 0
    },
    execute: async (changes, facts, decisions) => {
      changes.push({
        target: '.yarnrc.yml',
        key: 'plugins',
        addToExisting: true,
        value: [{ path: './lavamoat/.runner-plugin.js' }],
        comment:
          'Protect the runtime of calls to "yarn run" scripts using a local plugin.',
      })

      const filterEnv = await decisions.askToHarden(
        {
          id: 'y_filterenv',
          description:
            'Limit environment variables exposure to the shell running the scripts.',
          level: 'paranoid',
        },
        facts
      )

      if (filterEnv) {
        changes.push({
          ifNotExist: true,
          target: '/lavamoat',
          key: '.env.ban.json',
          value: null,
        })
      }

      const hardenScripts = await decisions.askToHarden(
        {
          id: 'y_hardenrun',
          description:
            'Limit permissions of node programs in "yarn run" scripts to prevent unexpected access to the environment.',
          level: 'paranoid',
        },
        facts
      )

      if (hardenScripts) {
        changes.push({
          target: '/lavamoat',
          ifNotExist: true,
          key: 'scripts.strict.json',
          value: null,
        })
        changes.push({
          target: '/lavamoat',
          ifNotExist: true,
          key: 'scripts.loose.json',
          value: null,
        })
        changes.push({
          target: 'package.json',
          key: 'scriptsConfig',
          ifNotExist: true,
          value: {
            '#default': 'lavamoat/scripts.loose.json',
          },
        })
      }
    },
  },

  {
    id: 'y_nonpm',
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
    id: 'y_ignore_scr',
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

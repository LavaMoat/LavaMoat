import { applyLatestVersion, assertDevEngines } from '../tools/versions.js'
import { buildAllowlistChanges } from './build-allowlist.js'
import { bundleRunner } from '../runner/runnerBundler.js'

/** @import {Opinion} from "../tools/types.js" */

/** @type {readonly Opinion[]} */
const definedOpinions = [
  {
    id: 'p_age',
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
    id: 'p_engines',
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
      {
        target: 'package.json',
        key: 'devEngines',
        value: {
          packageManager: {
            name: 'pnpm',
            version: '>=11.0.0',
            onFail: 'error',
          },
        },
      },
    ],
    execute: async (changes, facts, decisions, print) => {
      try {
        const response = await fetch(`https://registry.npmjs.org/pnpm/latest`)

        const packument = /** @type {{ version: string }} */ (
          await response.json()
        )
        return applyLatestVersion(changes, facts, packument.version)
      } catch (err) {
        print(Error(`    Failed to fetch latest pnpm version: ${err}`))
      }
    },
    verify: async (changes, _results, facts) =>
      assertDevEngines({
        actual: /** @type {any} */ (facts.packageJson)?.devEngines,
        expected: changes[1].value,
      }),
  },

  {
    id: 'p_exotic',
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
    id: 'p_scripts',
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
    verify: async (changes, results, facts) => {
      // check if pnpm_workspace.yml has allowBuilds set at all
      return facts.pnpmWorkspace?.allowBuilds !== undefined
    },
  },

  {
    id: 'p_nonpm',
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
    id: 'p_runner',
    description:
      'Take over pnpm run and remove bin scripts confusion possibility and configure other limitations.',
    level: 'paranoid',
    changes: [
      {
        target: '/lavamoat',
        key: '.runner.cjs',
        value: bundleRunner({
          packageManager: 'npm', // currently reusing the npm one
          fileName: 'runner.cjs',
        }),
      },
      {
        target: 'pnpm-workspace.yaml',
        key: 'scriptShell',
        value: './lavamoat/.runner.cjs',
        comment: 'Protect the runtime of calls to "pnpm run" scripts.',
      },
    ],
    verify: async (changes, results, _facts) => {
      // not verifying any of the customizations
      return results.length === 0
    },
    execute: async (changes, facts, decisions) => {
      const filterEnv = await decisions.askToHarden(
        {
          id: 'p_filterenv',
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
          id: 'p_hardenrun',
          description:
            'Limit permissions of node programs in "pnpm run" scripts to prevent unexpected access to the environment.',
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
            // '#default': 'lavamoat/scripts.loose.json',
            // even enabling policy makes pnpm 11.13 fail with
            //     path_1.default.upath = exports2.upath;
            //             ^
            //  TypeError: Cannot add property upath, object is not extensible
          },
        })
      }
    },
  },

  {
    id: 'p_no_downgrade',
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

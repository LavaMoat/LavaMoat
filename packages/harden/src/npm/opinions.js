/** @import {Opinion} from "../tools/types.js" */
import { buildAllowlistChanges } from './build-allowlist.js'

/** @type {readonly Opinion[]} */
const definedOpinions = [
  {
    description:
      'Enforce minimum npm version via devEngines in package.json to ensure security features are available.',
    level: 'baseline',
    changes: [
      {
        target: 'package.json',
        key: 'devEngines',
        value: {
          packageManager: {
            name: 'npm',
            // TODO: set to 12 ASAP
            version: '>=11.17.0',
            onFail: 'error',
          },
        },
      },
    ],
  },

  {
    description: 'Choose whether to disable all install scripts or allow some',
    level: 'baseline',
    alternatives: [
      {
        description:
          'Use the allowScripts field in package.json. Default to an empty allowScripts list.',
        level: 'baseline',
        changes: [
          {
            ifNotExist: true,
            target: 'package.json',
            key: 'allowScripts',
            value: {},
            comment: 'Empty default.',
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
      },
      {
        description:
          'Disable lifecycle scripts permanently to prevent malicious code execution on install, with no exceptions.',
        level: 'paranoid',
        changes: [
          {
            target: '.npmrc',
            key: 'ignore-scripts',
            value: 'true',
            comment: 'Ignore all lifecycle scripts always.',
          },
        ],
      },
    ],
  },

  {
    description:
      'Set a minimum release age to avoid installing recently-published (potentially malicious) packages.',
    level: 'moderate',
    changes: [
      {
        target: '.npmrc',
        key: 'min-release-age',
        value: '3',
        comment: 'Avoid installing packages published in last 3 days.',
      },
    ],
  },
  {
    description:
      'Take over npm run and remove bin scripts confusion possibility and limit env variables exposure to the shell running the scripts.',
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
        target: '.npmrc',
        key: 'script-shell',
        value: './lavamoat/.runner.js',
        comment: 'Protect the runtime of calls to npm run ',
      },
    ],
  },

  {
    description:
      'Block git dependencies which can bypass release age and script controls.',
    level: 'baseline',
    changes: [
      {
        target: '.npmrc',
        key: 'allow-git',
        value: 'none',
        comment: "Don't install packages from git urls.",
      },
    ],
    execute: async (changes, facts, decisions, print) => {
      if (facts.directGitDeps.length > 0) {
        const shouldBlockAnyway = await decisions.askToHarden(
          {
            description: `Block git dependencies entirely instead of allowing 'root' despite direct git dependencies being present`,
          },
          facts
        )
        if (shouldBlockAnyway) {
          print(
            `Found git dependencies in package.json. Blocking them by setting allow-git to none. Consider replacing them with safer sources if needed.`
          )
        } else {
          print(
            `Found git dependencies in package.json. Adjusting config to allow direct git dependencies only. Consider replacing them with safer sources if possible.`
          )
          changes[0].value = 'root'
        }
      }
    },
  },

  {
    description:
      'Disable git command entirely in npm to prevent git dependency resolution in older npm versions.',
    level: 'paranoid',
    changes: [
      {
        target: '.npmrc',
        key: 'git',
        value: 'false',
        comment:
          'Disable git entirely (false is a POSIX command that always fails).',
      },
    ],
    execute: async (changes, facts, decisions, print) => {
      if (facts.directGitDeps && facts.directGitDeps.length > 0) {
        print(
          `Found git dependencies in package.json. They won't work with git disabled and you chose paranoid level. Consider removing them or moving to a safer source if possible.`
        )
      }
    },
  },

  {
    description: 'Pin versions when adding items to allowScripts.',
    level: 'moderate',
    changes: [
      {
        target: '.npmrc',
        key: 'allow-scripts-pin',
        value: true,
        comment:
          'Pin allowed scripts to exact versions of dependencies to prevent unexpected script execution.',
      },
    ],
  },
]

export const opinions = Object.freeze(definedOpinions)

/** @import {Opinion} from "../tools/types.js" */

/** @type {readonly Opinion[]} */
export const opinions = Object.freeze([
  {
    description:
      'Disable lifecycle scripts by default to prevent malicious code execution on install.',
    level: 'baseline', // it's conditional on askToHarden, so will end up being applied in paranoid or asked in interactive mode
    execute: async (changes, facts, askToHarden) => {
      const shouldIgnoreAll = await askToHarden(
        { description: 'Disable all lifecycle scripts always' },
        facts
      )
      if (shouldIgnoreAll) {
        return [
          {
            target: 'config',
            key: 'ignore-scripts',
            value: 'true',
            comment: 'Ignore all lifecycle scripts always.',
          },
        ]
      } else {
        return []
      }
    },
  },

  {
    description:
      'Set a minimum release age to avoid installing recently-published (potentially malicious) packages.',
    level: 'moderate',
    changes: [
      {
        target: 'config',
        key: 'min-release-age',
        value: '3',
        comment: 'Avoid installing packages published in last 3 days.',
      },
    ],
  },

  {
    description:
      'Block git dependencies which can bypass release age and script controls.',
    level: 'baseline',
    changes: [
      {
        target: 'config',
        key: 'allow-git',
        value: 'none',
        comment: "Don't install packages from git urls.",
      },
    ],
    execute: async (changes, facts, askToHarden) => {
      if (facts.directGitDeps.length > 0) {
        const decision = await askToHarden(
          {
            description: `Block git dependencies entirely instead of allowing 'root' despite direct git dependencies being present`,
          },
          facts
        )
        if (decision) {
          console.warn(
            `Found git dependencies in package.json. Blocking them by setting allow-git to none. Consider replacing them with safer sources if needed.`
          )
        } else {
          console.warn(
            `Found git dependencies in package.json. Adjusting config to allow direct git dependencies only. Consider replacing them with safer sources if possible.`
          )
          changes[0].value = 'root'
        }
      }
    },
  },

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
            version: '>=12.0.0',
            onFail: 'error',
          },
        },
      },
    ],
  },

  {
    description:
      'Disable git command entirely in npm to prevent git dependency resolution in older npm versions.',
    level: 'paranoid',
    changes: [
      {
        target: 'config',
        key: 'git',
        value: 'false',
        comment:
          'Disable git entirely (false is a POSIX command that always fails).',
      },
    ],
    execute: async (changes, facts) => {
      if (facts.directGitDeps && facts.directGitDeps.length > 0) {
        console.warn(
          `Found git dependencies in package.json. They won't work with git disabled and you chose paranoid level. Consider removing them or moving to a safer source if possible.`
        )
      }
    },
  },
])

/** @import {Opinion} from "../tools/types.js" */

import { promisify } from 'node:util'
import child_process from 'node:child_process'
const execFile = promisify(child_process.execFile)

/** @type {readonly Opinion[]} */
export const opinions = Object.freeze([
  {
    description:
      'Disable lifecycle scripts by default to prevent malicious code execution on install.',
    level: 'baseline', // it's conditional on askToHarden, so will end up being applied in paranoid or asked in interactive mode
    execute: async (changes, facts, askToHarden) => {
      const shouldIgnoreAll = await askToHarden(
        {
          description:
            'Disable all lifecycle scripts always (instead of using allowScripts)',
        },
        facts
      )
      if (shouldIgnoreAll) {
        return [
          {
            target: '.npmrc',
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
        target: '.npmrc',
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
        target: '.npmrc',
        key: 'allow-git',
        value: 'none',
        comment: "Don't install packages from git urls.",
      },
    ],
    execute: async (changes, facts, askToHarden) => {
      if (facts.directGitDeps.length > 0) {
        const shouldBlockAnyway = await askToHarden(
          {
            description: `Block git dependencies entirely instead of allowing 'root' despite direct git dependencies being present`,
          },
          facts
        )
        if (shouldBlockAnyway) {
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
    execute: async (changes, facts) => {
      if (facts.directGitDeps && facts.directGitDeps.length > 0) {
        console.warn(
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
  {
    description: 'Set up allowScripts config',
    level: 'baseline',
    execute: async (changes, facts, askToHarden) => {
      // use npm approve-scripts
      const denyAll = await askToHarden(
        {
          description:
            'Deny all lifecycle scripts and let the user allow them manually.',
        },
        facts
      )

      const command = denyAll
        ? ['deny-scripts', '--all']
        : ['approve-scripts', '--allow-scripts-pin', '--all']
      try {
        const { stdout } = await execFile('npm', [...command, '--json'], {
          cwd: facts.cwd,
        })
        let nothingFound = true
        // if stdout parses as json and contains a field "allowScripts" with a non-empty array, it worked. Otherwise, assume no scripts were found.
        // https://github.com/npm/cli/issues/9529
        try {
          const parsed = JSON.parse(stdout)
          if (
            parsed.allowScripts &&
            Array.isArray(parsed.allowScripts) &&
            parsed.allowScripts.length > 0
          ) {
            nothingFound = false
          }
        } catch {
          // ignore parse errors and assume nothing found
        }
        if (nothingFound) {
          return [
            {
              target: 'package.json',
              key: 'allowScripts',
              value: {},
            },
          ]
        }
        if (denyAll) {
          console.log(
            `Denied all lifecycle scripts. You can allow specific ones using 'npm approve-scripts'.`
          )
        } else {
          console.log(
            `Approved lifecycle scripts for direct dependencies. Output:\n${stdout}`
          )
        }
      } catch (err) {
        console.error(`Failed to execute npm ${command}:`, err)
        return [
          {
            target: 'package.json',
            key: 'allowScripts',
            value: {},
          },
        ]
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
            // TODO: set to 12 ASAP
            version: '>=11.16.0',
            onFail: 'error',
          },
        },
      },
    ],
  },
])

// @ts-check

/**
 * @typedef {{
 *   key: string
 *   value: any
 *   comment?: string
 *   ifNotExist?: boolean
 * }} ConfigEntry
 */

/**
 * @typedef {{
 *   npm?: ConfigEntry[]
 *   yarn?: ConfigEntry[]
 *   pnpm?: ConfigEntry[]
 *   packagejson?: ConfigEntry[]
 * }} Changes
 */

/**
 * @typedef {{
 *   description: string
 *   level: 'strict' | 'moderate' | 'baseline'
 *   applicableTo?: string[]
 *   changes?: Changes
 *   execute?: (
 *     changes: Changes,
 *     facts: import('./tools/detect.js').Facts
 *   ) => Changes | undefined | void
 * }} Opinion
 */

/** @type {Opinion[]} */
export const opinions = [
  {
    description:
      'Disable lifecycle scripts by default to prevent malicious code execution on install.',
    level: 'baseline',
    changes: {
      npm: [
        {
          key: 'ignore-scripts',
          value: 'true',
          comment: 'Ignore all lifecycle scripts by default.',
        },
      ],
      yarn: [
        {
          key: 'enableScripts',
          value: false,
          comment: "Don't run lifecycle scripts by default.",
        },
      ],
      // pnpm 11+ defaults to not running scripts, no config needed
    },
  },

  {
    description:
      'Set a minimum release age to avoid installing recently-published (potentially malicious) packages.',
    level: 'moderate',
    changes: {
      npm: [
        {
          key: 'min-release-age',
          value: '3',
          comment: 'Avoid installing packages published in last 3 days.',
        },
      ],
      yarn: [
        {
          key: 'npmMinimalAgeGate',
          value: 4320,
          comment:
            'Avoid installing packages published in last 3 days (in minutes).',
        },
      ],
      pnpm: [
        {
          key: 'minimumReleaseAge',
          value: 4320,
          comment:
            'Avoid installing packages published in last 3 days (in minutes).',
        },
      ],
    },
  },

  {
    description:
      'Block git dependencies which can bypass release age and script controls.',
    level: 'baseline',
    applicableTo: ['npm'],
    changes: {
      npm: [
        {
          key: 'allow-git',
          value: 'none',
          comment: "Don't install packages from git urls.",
        },
      ],
    },
    execute: (changes, facts) => {
      if (facts.directGitDeps.length > 0) {
        console.warn(
          `Found git dependencies in package.json. Adjusting config to allow direct git dependencies only. Consider replacing them with safer sources if possible.`
        )
        // @ts-expect-error visibly exists
        changes.npm[0].value = 'root'
      }
    },
  },

  {
    description:
      'Block git dependencies which can bypass release age and script controls.',
    level: 'baseline',
    applicableTo: ['yarn'],
    changes: {
      yarn: [
        {
          key: 'approvedGitRepositories',
          value: [],
          comment: 'Allowlist of git dependencies. Empty to block all.',
        },
      ],
      // pnpm 11+ blocks exotic subdeps by default
    },
    execute: (changes, facts) => {
      if (facts.directGitDeps.length > 0) {
        // TODO: the way git deps are specified is not exactly the same as the way the allowlist works, so it should need editing. We could implement processing them to create proper allowlist entries.
        console.warn(
          `Found git dependencies in package.json. Edit approvedGitRepositories in .yarnrc.yml accordingly.`
        )
        // @ts-expect-error visibly exists
        changes.yarn[0].value = facts.directGitDeps
      }
    },
  },

  {
    description:
      'Enforce minimum npm version via devEngines in package.json to ensure security features are available.',
    level: 'baseline',
    applicableTo: ['npm'],
    changes: {
      packagejson: [
        {
          key: 'devEngines',
          value: {
            packageManager: {
              name: 'npm',
              version: '>=11.16.0',
              onFail: 'error',
            },
          },
        },
      ],
    },
  },

  {
    description:
      'Enforce minimum yarn version via packageManager field in package.json.',
    level: 'moderate',
    applicableTo: ['yarn'],
    changes: {
      packagejson: [
        {
          ifNotExist: true,
          key: 'packageManager',
          value: 'yarn@4.15.0',
        },
      ],
    },
  },

  // {
  //   description:
  //     'Enforce minimum pnpm version via packageManager field in package.json.',
  //   level: 'moderate',
  //   applicableTo: ['pnpm'],
  //   changes: {
  //     packagejson: [
  //       {
  //         ifNotExist: true,
  //         key: 'packageManager',
  //         value: 'pnpm@11.0.0',
  //       },
  //     ],
  //   },
  // },

  {
    description:
      'Disable git command entirely in npm to prevent git dependency resolution in older npm versions.',
    level: 'strict',
    applicableTo: ['npm'],
    changes: {
      npm: [
        {
          key: 'git',
          value: 'false',
          comment:
            'Disable git entirely (false is a POSIX command that always fails).',
        },
      ],
    },
    execute: (changes, facts) => {
      if (facts.directGitDeps && facts.directGitDeps.length > 0) {
        console.warn(
          `Found git dependencies in package.json. Cannot disable git in old npm versions. Consider removing git dependencies or using a newer npm version that supports allow-git config.`
        )
        delete changes.npm // remove the git disablement to avoid breaking the install, since it can't be applied safely
      }
    },
  },

  {
    description:
      'Disable exotic subdeps in older pnpm versions in case someone failed to update.',
    level: 'strict',
    applicableTo: ['pnpm'],
    changes: {
      pnpm: [
        {
          key: 'blockExoticSubdeps',
          value: true,
          comment: 'Disable exotic subdeps in older pnpm versions.',
        },
      ],
    },
  },
  {
    description:
      'Disable global cache in yarn to avoid cross-project cache poisoning.',
    level: 'strict',
    applicableTo: ['yarn'],
    changes: {
      yarn: [
        {
          key: 'enableGlobalCache',
          value: false,
          comment: 'Disable global cache to avoid cross-project poisoning.',
        },
      ],
    },
  },

  {
    description: 'Enable trust policy in pnpm to detect provenance downgrades.',
    level: 'strict',
    applicableTo: ['pnpm'],
    changes: {
      pnpm: [
        {
          key: 'trustPolicy',
          value: 'no-downgrade',
          comment:
            'Fail if trusted publishing or provenance is gone from a package that used to have it.',
        },
      ],
    },
  },
]

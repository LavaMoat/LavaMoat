/**
 * @import {
 *   Change,
 *   Decisions,
 *   Facts,
 *   PrintApi
 * } from "../tools/types.js"
 */

/**
 * Build the allowlist for approved lifecycle scripts using
 * @lavamoat/allow-scripts.
 *
 * This is the paranoid implementation: install the tool and set an empty
 * `lavamoat.allowScripts` object. No scripts are allowed by default.
 *
 * @param {Facts} facts
 * @param {Decisions} _decisions
 * @param {PrintApi} _print
 * @returns {Promise<Change[]>}
 */
export async function buildAllowlistChanges(facts, _decisions, _print) {
  /** @type {Change[]} */
  const changes = []

  const maybeNodeLinker = facts.yarnConfig?.nodeLinker
  if (maybeNodeLinker !== 'node-modules') {
    changes.push({
      target: '.yarnrc.yml',
      key: 'nodeLinker',
      value: 'node-modules',
      comment:
        '@lavamoat/allow-scripts requires Yarn node-modules linker (not PnP).',
    })
  }

  const plugins = /** @type {{ path: string; spec?: string }[]} */ (
    facts.yarnConfig?.plugins || []
  )

  if (
    plugins.length === 0 ||
    !JSON.stringify(plugins).includes('lavamoat/plugin-allow-scripts.js')
  ) {
    plugins.push({ path: './lavamoat/plugin-allow-scripts.js' })
    changes.push(
      {
        target: '.yarnrc.yml',
        key: 'plugins',
        value: plugins,
        comment:
          '@lavamoat/allow-scripts uses a plugin to execute allowed scripts after install.',
      },
      {
        target: '/lavamoat',
        key: 'plugin-allow-scripts.js',
        value: null,
      }
    )
  }

  changes.push(
    {
      target: 'package.json',
      key: ['devDependencies', '@lavamoat/allow-scripts'],
      value: '^5.0.2',
      comment: 'Install allow-scripts for explicit lifecycle script policy.',
    },
    {
      target: 'package.json',
      key: ['lavamoat', 'allowScripts'],
      value: {},
      comment:
        'Paranoid default: no lifecycle scripts are allowed until explicitly approved.',
      ifNotExist: true,
    }
  )

  return changes
}

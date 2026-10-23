// @ts-check

/**
 * Main entry point for the LavaMoat dictionary configuration & definitions.
 *
 * The only weird thing this does is check if generated files exist in the
 * `dict` dir; if they do, we use them. If they don't (in case we're in a
 * `LavaMoat/LavaMoat` dev environment without having run `build`), we just use
 * the files in the `src` dir.
 *
 * @packageDocumentation
 */

/** @import {CSpellSettings} from '@cspell/cspell-types' */

import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Returns relative path to dictionary file, preferring files in `dict` dir if
 * it exists.
 *
 * @param {string} filename Dictionary filename
 * @returns {string} Relative path to dictionary file
 */
const getDictionaryFile = (filename) =>
  existsSync(join(import.meta.dirname, 'dict', filename))
    ? `./dict/${filename}`
    : `./src/${filename}`

/** @type {CSpellSettings} */
const cspellConfig = {
  description: 'LavaMoat Project Dictionary',
  dictionaries: ['lavamoat', 'lavamoat-usernames', 'lavamoat-corrections'],
  dictionaryDefinitions: [
    {
      description: 'LavaMoat Words Dictionary',
      kind: 'words',
      name: 'lavamoat',
      path: getDictionaryFile('lavamoat.txt'),
    },
    {
      description: 'LavaMoat Usernames Dictionary',
      kind: 'words',
      name: 'lavamoat-usernames',
      path: getDictionaryFile('lavamoat-usernames.txt'),
    },
    {
      description: 'LavaMoat Corrections Dictionary',
      kind: 'suggest-words',
      name: 'lavamoat-corrections',
      path: getDictionaryFile('lavamoat-corrections.txt'),
    },
  ],
  ignorePaths: [
    '**/policy*.json',
    '**/package.json',
    '**/package-lock.json',
    '**/tsconfig*.json',
    '**/dist/**',
    '**/.git/**',
    '**/*.tsbuildinfo',
    '**/CHANGELOG.md',
    '**/coverage/**',
    '**/node_modules/**',
    '**/snapshots/**/*.md',
    '**/.gitignore',
    '**/.vscode/**',
  ],
  ignoreRegExpList: [
    '\\S+\\.[mc]?[jt]s',
    '@\\S+',
    '\\b([A-Z]{2,}_)+[A-Z]{2,}\\b',
    '\\b\\w+(rc|js|policy|ify)\\b',
    '\\b(auto)\\w+\\b',
  ],
  name: '@lavamoat/dictionary',
  overrides: [
    {
      filename: ['**/*.{js,mjs,cjs,ts,mjs,cts}'],
      ignoreRegExpList: [
        "\\s+from\\s+'.+';?$",
        '\\s+from\\s+".+";?$',
        "require\\('.+'\\);?$",
        'require\\(".+"\\);?$',
      ],
    },
    {
      caseSensitive: true,
      flagWords: ['NPM'],
      filename: ['**/*.{md,mdx}'],
    },
  ],
  readonly: true,
}

export default cspellConfig

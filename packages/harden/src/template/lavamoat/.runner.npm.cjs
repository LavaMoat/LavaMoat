#! /usr/bin/env node



const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const scriptName = process.env.npm_lifecycle_event
const scriptPayload = process.argv[3]

const pkgJsonPath = process.env.npm_package_json

if (!pkgJsonPath) {
  throw Error(
    `[LavaMoat] FATAL: 'npm_package_json' environment variable is missing. A modern package manager is required.`
  )
}

const pkgJsonFolder = path.dirname(pkgJsonPath)
const fallbackShell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh'
const shellArgs = process.platform === 'win32' ? ['/d', '/s', '/c'] : ['-c']

const pathBinMatcherString = `node_modules${path.sep}.bin`

const wrapper = makeRunScriptWrapper(
  {
    scriptName,
    projectRoot: pkgJsonFolder,
    pathBinMatcher: (fragment) => fragment.endsWith(pathBinMatcherString),
    customizePermissionsConfig: addMandatoryReads,
    readScriptsConfig: () => {
      try {
        const pkgData = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
        process._rawDebug({
          scriptName,
          pkgData,
        })
        return pkgData.scriptsConfig
      } catch {
        return undefined
      }
    },
  },
  {
    readFileSync: fs.readFileSync,
    pathJoin: path.join,
    pathDelimiter: path.delimiter,
  }
)

const customEnv = wrapper.processEnv(process.env)

process._rawDebug(customEnv.NODE_OPTIONS)

// Note: spawnSync is used here instead of process.execve because execve is
// not available on Windows. Leaving this here to switch to execve in case other reasons to
// drop Windows support arise.
// process.execve(fallbackShell, [...shellArgs, scriptPayload], customEnv)

const result = spawnSync(fallbackShell, [...shellArgs, scriptPayload], {
  stdio: 'inherit',
  env: customEnv,
  cwd: pkgJsonFolder,
})
if (result.error) {
  console.error(
    `[LavaMoat wrapper failed to execute "${scriptName}"] ${result.error.message}`
  )
}
if (result && 'status' in result) {
  process.exit(result.status)
} else {
  process.exit(1)
}

/**
 * @param {Record<string, boolean | string | string[]>} configOptions
 * @param {NodeJS.ProcessEnv} env
 */
function addMandatoryReads(configOptions, env) {
  if (!configOptions['--permission']) {
    return
  }
  if (!configOptions['--allow-fs-read']) {
    configOptions['--allow-fs-read'] = []
  }

  configOptions['--allow-fs-read'].push(env['npm_config_prefix'])
  configOptions['--allow-fs-read'].push(env['npm_config_userconfig'])
}

;;
/**
 * @typedef {Record<string, boolean | string | string[]>} ConfigOptions
 */

/**
 * @param {any} param0
 * @param {any} param1
 * @returns {{
 *   processEnv: (existingEnv: NodeJS.ProcessEnv) => NodeJS.ProcessEnv
 * }}
 */
function makeRunScriptWrapper(
  {
    scriptName,
    projectRoot,
    pathBinMatcher,
    customizePermissionsConfig,
    readScriptsConfig,
  },
  { readFileSync, pathJoin, pathDelimiter }
) {
  const DEFAULT_PERMISSION_KEY = '#default'

  /** @param {string} filePath */
  function readJsonFile(filePath) {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  }

  /**
   * @param {object} opts
   * @param {Record<string, string> | undefined} opts.scriptsConfig
   * @param {string} opts.scriptName
   * @param {string} opts.projectRoot
   */
  function readConfig({ scriptsConfig, scriptName, projectRoot }) {
    if (!scriptsConfig) {
      return {}
    }
    const configName =
      scriptsConfig[scriptName] || scriptsConfig[DEFAULT_PERMISSION_KEY]

    // config needs to be optional, because it's opt-in first and specifying a default turns it opt-out.
    if (!configName) {
      return {}
    }
    const configPath = pathJoin(projectRoot, configName)
    let conf
    try {
      conf = readJsonFile(configPath)
      if (typeof conf !== 'object' || conf === null) {
        throw Error(`Expected an object, got ${typeof conf}`)
      }
    } catch (err) {
      throw Error(
        `[LavaMoat] Error loading script config file "${configPath}": ${err.message}`,
        { cause: err }
      )
    }
    return conf
  }

  /** @param {ConfigOptions} configOptions */
  function makeFlagsFromConfig(configOptions) {
    return Object.entries(configOptions)
      .map(([arg, value]) => {
        if (typeof value === 'boolean') {
          return value ? arg : ''
        } else if (Array.isArray(value)) {
          return value.map((v) => `${arg}="${v}"`).join(' ')
        } else {
          return `${arg}="${value}"`
        }
      })
      .filter(Boolean)
      .join(' ')
  }

  /**
   * Checks the config obtained from package.json and puts it in as NODE_OPTIONS
   *
   * @param {string | undefined} existingOptions
   * @param {ConfigOptions} configOptions
   * @param {NodeJS.ProcessEnv} env
   */
  function installNodeOptions(existingOptions, configOptions, env) {
    if (!configOptions) {
      return existingOptions
    }

    customizePermissionsConfig(configOptions, env)

    const confOption = makeFlagsFromConfig(configOptions)

    return `${existingOptions || ''} ${confOption.trim()}`.trim()
  }

  /**
   * Filter environment variables based on ban keywords
   *
   * @param {NodeJS.ProcessEnv} env
   * @param {string} lavamoatDir
   * @returns {NodeJS.ProcessEnv}
   */
  function filterEnv(env, lavamoatDir) {
    const banFilePath = pathJoin(lavamoatDir, '.env.ban.json')
    let banConfig

    try {
      banConfig = readJsonFile(banFilePath)
    } catch (err) {
      console.error(
        `[LavaMoat] Warning: Failed to read .env.ban.json: ${err.message}.`
      )
      return env
    }
    let banKeywords = []
    try {
      if (Array.isArray(banConfig)) {
        banKeywords.push(...banConfig)
      } else {
        throw Error(`Expected .env.ban.json to contain an array of keywords`)
      }
    } catch (err) {
      console.error(
        `[LavaMoat] Warning: Failed to read .env.ban.json: ${err.message}.`
      )
      return env
    }

    /** @type {NodeJS.ProcessEnv} */
    const filteredEnv = {}
    const bannedEnv = []
    banKeywords = banKeywords.map((keyword) => keyword.toLowerCase())
    for (const [key, value] of Object.entries(env)) {
      if (
        !key.toLowerCase().startsWith('npm_config') &&
        banKeywords.some((keyword) => key.toLowerCase().includes(keyword))
      ) {
        bannedEnv.push(key)
      } else {
        filteredEnv[key] = value
      }
    }
    if (bannedEnv.length > 0) {
      console.error(
        `[LavaMoat] Warning: The following environment variables were banned: ${bannedEnv.join(', ')}`
      )
    }
    return filteredEnv
  }

  /** @param {string} PATH */
  function envPathOpinions(PATH) {
    const pathFragments = PATH.split(pathDelimiter)
    // This is to eliminate bin confusion attacks.
    // Find node_modules/.bin and remove it, put it on the end that gets looked up last when looking for a name in the path.

    /** @type {string[]} */
    const filteredFragments = []
    /** @type {string | undefined} */
    let nodeModulesBinPath

    for (const fragment of pathFragments) {
      if (pathBinMatcher(fragment)) {
        if (nodeModulesBinPath) {
          console.error(
            `[LavaMoat] Warning: Found multiple node_modules/.bin paths in PATH. This is unexpected and may cause issues. ${PATH}`
          )
        }
        nodeModulesBinPath = fragment
      } else {
        filteredFragments.push(fragment)
      }
    }
    if (nodeModulesBinPath !== undefined) {
      filteredFragments.push(nodeModulesBinPath)
    }
    return filteredFragments.join(pathDelimiter)
  }

  return {
    processEnv: (existingEnv) => {
      const scriptsConfig = readScriptsConfig(projectRoot)
      const config = readConfig({
        scriptsConfig,
        scriptName,
        projectRoot,
      })

      process._rawDebug({
        scriptName,
        config,
        scriptsConfig,
        projectRoot,
      })

      // Smell: Windows environment variables are case-insensitive, but Node's process.env
      // might expose it as 'Path' instead of 'PATH'. Checking both ensures it doesn't get wiped out.

      const existingPath = existingEnv.PATH || existingEnv.Path || ''

      const lavamoatDir = pathJoin(projectRoot, 'lavamoat')

      const fixedEnv = {
        ...filterEnv(existingEnv, lavamoatDir),
        PATH: envPathOpinions(existingPath),
        NODE_OPTIONS: installNodeOptions(
          existingEnv.NODE_OPTIONS,
          config.nodeOptions,
          existingEnv
        ),
      }
      return fixedEnv
    },
  }
}



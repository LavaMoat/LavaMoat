declare global {
  type LMFolderIntegrityCheckOptions = {
    projectRoot: string
    pathJoin: (...segments: string[]) => string
    createHash: typeof import('node:crypto').createHash
    readdirSync: typeof import('node:fs').readdirSync
    readFileSync: typeof import('node:fs').readFileSync
  }

  type LMFolderIntegrityCheck = {
    verifyAfter: () => void
  }

  type MakeRunScriptWrapperConfigOptions = Record<
    string,
    boolean | string | string[]
  >

  type ConfigOptions = MakeRunScriptWrapperConfigOptions

  type MakeRunScriptWrapperOptions = {
    scriptName?: string
    scriptPayload?: string
    projectRoot: string
    pathBinMatcher: (fragment: string) => boolean
    customizePermissionsConfig: (
      configOptions: MakeRunScriptWrapperConfigOptions,
      env: NodeJS.ProcessEnv
    ) => void
    readScriptsConfig: (
      projectRoot?: string
    ) => Record<string, string> | undefined
  }

  type MakeRunScriptWrapperIO = {
    readFileSync: (path: string, encoding: 'utf8') => string
    pathJoin: (...segments: string[]) => string
    pathDelimiter: string
    tmpdir: () => string
    realpathSync: (path: string) => string
  }

  type MakeRunScriptWrapper = {
    processEnv: (existingEnv: NodeJS.ProcessEnv) => NodeJS.ProcessEnv
  }

  function makeRunScriptWrapper(
    options: MakeRunScriptWrapperOptions,
    io: MakeRunScriptWrapperIO
  ): MakeRunScriptWrapper

  function LMFolderIntegrityCheck(
    options: LMFolderIntegrityCheckOptions
  ): LMFolderIntegrityCheck
}

export {}

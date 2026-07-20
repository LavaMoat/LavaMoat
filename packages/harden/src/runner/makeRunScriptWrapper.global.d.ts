declare global {
  type MakeRunScriptWrapperConfigOptions = Record<
    string,
    boolean | string | string[]
  >

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
}

export {}

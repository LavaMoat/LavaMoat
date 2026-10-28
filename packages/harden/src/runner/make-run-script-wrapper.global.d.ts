import { type Stats } from 'fs'
declare global {
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
    readPackageJson: (projectRoot?: string) => Record<string, any> | undefined
    /**
     * Optional. Creates `overrideDir` with links for known bin names. Not
     * called when the dir exists or the permission model is active.
     */
    prepareBinOverrides?: (params: {
      dependencies: string[]
      overrideDir: string
    }) => void
  }

  type MakeRunScriptWrapperIO = {
    readFileSync: (path: string, encoding: 'utf8') => string
    existsSync: (path: string) => boolean
    pathJoin: (...segments: string[]) => string
    pathDelimiter: string
    tmpdir: () => string
    realpathSync: (path: string) => string
    lstatSync: (path: string) => Stats
    readlinkSync: (path: string) => string
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

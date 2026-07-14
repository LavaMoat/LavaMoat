declare global {
  function makeRunScriptWrapper(
    options: {
      scriptName: string
      projectRoot: string
      pathBinMatcher: (fragment: string) => boolean
      customizePermissionsConfig: (
        configOptions: Record<string, boolean | string | string[]>,
        env: NodeJS.ProcessEnv
      ) => void
      readScriptsConfig: (
        projectRoot?: string
      ) => Record<string, string> | undefined
    },
    io: {
      readFileSync: (path: string, encoding: 'utf8') => string
      pathJoin: (...segments: string[]) => string
      pathDelimiter: string
    }
  ): {
    processEnv: (existingEnv: NodeJS.ProcessEnv) => NodeJS.ProcessEnv
  }
}

export {}

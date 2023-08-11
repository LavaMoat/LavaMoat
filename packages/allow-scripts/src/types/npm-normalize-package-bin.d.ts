declare module 'npm-normalize-package-bin' {
  import type { PackageJson } from 'type-fest'

  namespace normalizePackageBin {
    export { PackageJson }
    export type NormalizedBinPackageJson = Omit<PackageJson, 'bin'> & {
      bin?: Partial<Record<string, string>>
    }
  }

  function normalizePackageBin(
    pkg: normalizePackageBin.PackageJson
  ): normalizePackageBin.NormalizedBinPackageJson

  export = normalizePackageBin
}

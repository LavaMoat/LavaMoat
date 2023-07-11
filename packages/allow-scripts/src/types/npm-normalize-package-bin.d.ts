declare module "npm-normalize-package-bin" {
  namespace normalizePackageBin {
    interface PackageBin {
      name: string;
      bin?: string | Record<string, string>;
    }

    interface NormalizedPackageBin {
      name: string;
      bin?: Record<string, string>;
    }
  }

  function normalizePackageBin(
    pkg: normalizePackageBin.PackageBin
  ): normalizePackageBin.NormalizedPackageBin;

  export = normalizePackageBin;
}

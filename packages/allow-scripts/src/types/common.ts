import type { JsonObject, PackageJson } from 'type-fest';

declare global {
  export interface PkgLavamoatConfig {
    allowBins?: JsonObject;
    allowConfig?: JsonObject;
    allowScripts?: JsonObject;
    allowedPatterns?: JsonObject;
    disallowedPatterns?: JsonObject;
    excessPolicies?: JsonObject;
    missingPolicies?: JsonObject;
  }

  export type LavamoatPackageJson = PackageJson & { lavamoat: PkgLavamoatConfig };

  export interface PkgInfo {
    canonicalName: string;
    path: string;
    scripts: JsonObject;
  }

  /**
   * Configuration for a type of scripts policies
   */
  export interface ScriptsConfig {
    allowConfig: JsonObject;
    packagesWithScripts: Map<string, [PkgInfo]>;
    allowedPatterns: string[];
    disallowedPatterns: string[];
    missingPolicies: string[];
    excessPolicies: string[];
  }

  /**
   * Individual bin link info
   */
  export interface BinInfo {
     canonicalName: string;
     isDirect: boolean;
     bin: string;
     path: string;
     link: string;
     fullLinkPath: string;
  }

  export type BinCandidates = Map<string, BinInfo[]>;

  /**
   * Configuration for a type of bins policies
   * */
  export interface BinsConfig {
     allowConfig: Record<string, any>;
     binCandidates: BinCandidates;
     allowedBins: BinInfo[];
     firewalledBins: BinInfo[];
     excessPolicies: string[];
     somePoliciesAreMissing: boolean;
  }

  // config.js
  export interface SetDefaultConfigurationParams {
    rootDir: string;
    lifecycleEvents?: string[];
  }

  export interface SavePackageConfigurationsParams {
    rootDir: string;
    conf: PkgConfs;
  }

  export interface GetOptionsForBinParams {
    rootDir: string;
    name: string;
    lifecycleEvents?: string[];
  }

  // setup.js
  export interface AreBinsBlockedParams {
    /** Turn off memoization, make a fresh lookup */
    noMemoization?: boolean;
  }

  export interface PkgConfs {
    packageJson: LavamoatPackageJson;
    configs: {
      lifecycle: ScriptsConfig;
      bin: BinsConfig;
    }
    somePoliciesAreMissing: boolean;
    canonicalNamesByPath: Map<string,string>;
  }

  export interface WriteRcFileContentParams {
    file: string;
    entry: string;
  }

  // runAllowedPackages.js
  export interface RunAllowedPackagesParams {
    rootDir: string;
  }

  export interface RunScriptParams {
    event: string;
    path: string;
  }

  // report.js
  export interface PrintPackagesListParams {
    rootDir: string;
  }

  export interface PrintMissingPoliciesIfAnyParams {
    missingPolicies: string[];
    packagesWithScripts: Map<string, unknown[]>;
  }
}

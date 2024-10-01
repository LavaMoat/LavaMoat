declare global {
  export interface PkgInfo {
    canonicalName: string;
    path: string;
    scripts: Object;
  }

  /**
   * Configuration for a type of scripts policies
   */
  export interface ScriptsConfig {
    allowConfig: Record<string, any>;
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
}

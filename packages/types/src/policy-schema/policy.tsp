namespace LavaMoat.Policy {
  alias ResourceRecord<T = boolean> = Record<T>;

  alias BuiltinPolicy = ResourceRecord;

  alias PackagePolicy = ResourceRecord;

  alias GlobalPolicy = ResourceRecord<GlobalPolicyValue>;

  alias Resolutions = ResourceRecord<Record<string>>;

  #deprecated "Use 'true' instead"
  alias GlobalPolicyRead = "read";

  alias GlobalPolicyWrite = "write";

  alias GlobalPolicyValue = GlobalPolicyRead | GlobalPolicyWrite | boolean;

  alias ResourcePolicy = ResourceRecord<PackageResourcePolicy>;

  model PackageResourcePolicy {
    builtin?: BuiltinPolicy;
    package?: PackagePolicy;
    global?: GlobalPolicy;
  }

  model LavaMoatPolicy {
    resources?: Record<PackageResourcePolicy>;
    resolutions?: Resolutions;
  }

  model LavaMoatPolicyDebug extends LavaMoatPolicy {
    debugInfo: Record<DebugInfo>;
  }

  enum ModuleRecordType {
    builtin,
    native,
    js,
  }

  model LavaMoatModuleRecord {
    /**
     * Module specifier
     */
    specifier: string;

    /**
     * Path to module file.
     *
     * If a builtin, this is the same as `specifier`
     */
    file: string;

    /**
     * Module type
     */
    type: ModuleRecordType;

    /**
     * Package name
     *
     * If a builtin, this is the same as `specifier`
     */
    packageName: string;

    /**
     * Content of the module file (raw source code)
     */
    content?: string;

    /**
     * Import map
     */
    importMap: Record<string>;
  }

  model ParseError {
    code: string;
    reasonCode: string;
  }

  model DebugInfo {
    /**
     * @todo This is an array of `@babel/parser`'s `ParseError`.
     */
    parseErrors?: ParseError[];

    moduleRecord: LavaMoatModuleRecord;

    /**
     * @todo Move these types into lavamoat-tofu
     */
    sesCompat: SesCompat;

    globals: Record<boolean>;
    builtin: string[];
  }

  model SesCompat {
    dynamicRequires: SesCompatObj[];
    primordialMutations: SesCompatObj[];
    strictModeViolations: SesCompatObj[];
  }

  model SesCompatObj {
    node: SesCompatNode;
  }

  model SesCompatNode {
    loc: SesCompatNodeLocation;
  }

  model SesCompatNodeLocation {
    start: NodeLocation;
    end: NodeLocation;
  }

  model NodeLocation {
    column: uint32;
    index: uint32;
    line: uint32;
  }
}

declare module 'bin-links/lib/bin-target.js' {
  namespace binTarget {
    interface BinTargetOptions {
      top?: string;
      path: string;
    }
  }

  function binTarget(opts: binTarget.BinTargetOptions): string;

  export = binTarget;
}

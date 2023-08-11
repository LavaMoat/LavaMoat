declare module 'bin-links/lib/shim-bin.js' {
  namespace shimBin {
    interface ShimBinOptions {
      path: string;
      from: string;
      to: string;
      absFrom: string;
      force: boolean;
    }
  }

  function shimBin(opts: shimBin.ShimBinOptions): Promise<boolean>;

  export = shimBin;
}

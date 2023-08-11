declare module 'bin-links/lib/link-bin.js' {
  namespace linkBin {
    interface LinkBinOptions {
      path: string;
      from: string;
      to: string;
      absFrom: string;
      force: boolean;
    }
  }

  function linkBin(opts: linkBin.LinkBinOptions): Promise<boolean>;

  export = linkBin;
}

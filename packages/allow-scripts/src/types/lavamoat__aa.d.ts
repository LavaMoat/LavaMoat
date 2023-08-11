// XXX: temporary while `@lavamoat/aa` exports no types

declare module '@lavamoat/aa' {
  export interface Resolver {
    sync(path: string, opts: { basedir: string }): string;
  }
  export interface LoadCanonicalNameMapOpts {
    rootDir: string;
    includeDevDeps?: boolean;
    resolve?: Resolver;
  }
  export function loadCanonicalNameMap(
    opts: LoadCanonicalNameMapOpts
  ): Promise<Map<string, string>>;
}

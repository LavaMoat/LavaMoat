declare module "@npmcli/run-script" {
  import { StdioOptions } from "node:child_process";
  import type PromiseSpawn from "@npmcli/promise-spawn";

  namespace npmRunScript {
    interface RunScriptOptions {
      event: string;
      path: string;
      scriptShell?: string;
      env?: Record<string, string>;
      stdio?: StdioOptions;
      stdioString?: boolean;
      banner?: boolean;
    }
  }

  function npmRunScript(
    opts: npmRunScript.RunScriptOptions
  ): ReturnType<typeof PromiseSpawn>;

  export = npmRunScript;
}

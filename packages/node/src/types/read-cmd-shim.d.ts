declare module 'read-cmd-shim' {
  /**
   * Reads the `cmd-shim` located at path and resolves with the relative path
   * that the shim points at. Consider this as roughly the equivalent of
   * {@link fs.readlink}.
   *
   * This can read both `.cmd` style that are run by the Windows Command Prompt
   * and PowerShell, and the kind without any extension that are used by
   * Cygwin.
   *
   * This can return errors that {@link fs.readFile} returns, except that they'll
   * include a stack trace from where `readCmdShim` was called. Plus it can
   * return a special `ENOTASHIM` exception, when it can't find a cmd-shim in
   * the file referenced by `path`. This should only happen if you pass in a
   * non-command shim.
   *
   * @param path The path to the shim file
   * @returns The relative target path extracted from the shim
   * @throws ENOTASHIM If the file is not a recognized shim format
   */
  function readCmdShim(path: string): Promise<string>

  namespace readCmdShim {
    /**
     * The same as {@link readCmdShim} but synchronous. Errors are thrown.
     *
     * @param path The path to the shim file
     * @returns The relative target path extracted from the shim
     * @throws ENOTASHIM If the file is not a recognized shim format
     */
    function sync(path: string): string
  }

  export default readCmdShim
}

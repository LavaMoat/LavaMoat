/**
 * `Dirent`-like object returned by `glob`; adds a `fullpath()` method and
 * `parent` prop
 *
 * @defaultValue `Path` from `path-scurry`, which is resolved by `glob()` if the
 * @typedef {import('fs').Dirent & {
 *   fullpath: () => string
 *   parent?: GlobDirent
 * }} GlobDirent
 */

/**
 * Function used to spawn `npm publish`.
 *
 * Returned `EventEmitter` _must_ emit `exit` and _may_ emit `error`.
 *
 * @defaultValue `childProcess.spawn`
 * @typedef {(
 *   cmd: string,
 *   args: string[],
 *   opts: import('node:child_process').SpawnOptions
 * ) => import('node:events').EventEmitter} SpawnFn
 */

/**
 * Function used to execute commands and retrieve the `stdout` and `stderr` from
 * execution.
 *
 * @typedef {(
 *   cmd: string,
 *   args?: string[],
 *   opts?: { cwd?: string; shell?: boolean }
 * ) => Promise<{ stdout: string; stderr: string }>} ExecFileFn
 */

/**
 * Globbing function.
 *
 * Pretty tightly-bound to `glob`, unfortunately.
 *
 * @defaultValue `Glob.glob`
 * @typedef {(
 *   pattern: string | string[],
 *   opts: import('glob').GlobOptionsWithFileTypesTrue
 * ) => Promise<GlobDirent[]>} GlobFn
 */

/**
 * Function used to parse a JSON string
 *
 * @defaultValue `JSON.parse`
 * @typedef {(json: string) => any} ParseJsonFn
 */
/**
 * A loosey-gooesy `fs.promises` implementation
 *
 * @typedef {{
 *   [K in keyof Pick<
 *     typeof import('node:fs/promises'),
 *     'lstat' | 'readdir' | 'readlink' | 'realpath' | 'readFile'
 *   >]: (...args: any[]) => Promise<any>
 * }} MinimalFsPromises
 */

/**
 * Bare minimum `Console` implementation for our purposes
 *
 * @typedef MinimalConsole
 * @property {Console['error']} error
 */

/**
 * Bare minimum `fs` implementation for our purposes
 *
 * @typedef MinimalFs
 * @property {MinimalFsPromises} promises
 */

/**
 * Options for {@link Laverna}, merged with {@link DEFAULT_OPTS the defaults}.
 *
 * @typedef AllLavernaOptions
 * @property {boolean} dryRun - Whether to publish in dry-run mode
 * @property {string} root - Workspace root
 * @property {string[]} newPkg - New packages to publish
 * @property {boolean} yes - Skip confirmation prompt
 */
/**
 * Options for controlling Laverna's behavior.
 *
 * @typedef {Partial<AllLavernaOptions>} LavernaOptions
 */
/**
 * Capabilities for {@link Laverna} merged with {@link DEFAULT_CAPS the defaults}.
 *
 * @typedef AllLavernaCapabilities
 * @property {MinimalFs} fs - Bare minimum `fs` implementation
 * @property {GlobFn} glob - Function to glob for files
 * @property {ExecFileFn} execFile - Function to execute a command
 * @property {SpawnFn} spawn - Function to spawn a process
 * @property {ParseJsonFn} parseJson - Function to parse JSON
 * @property {MinimalConsole} console - Console to use for logging
 * @property {GetVersionsFactory} [getVersionsFactory] - Factory for
 *   {@link GetVersions}
 * @property {InvokePublishFactory} [invokePublishFactory] - Factory for
 *   {@link InvokePublish}
 */
/**
 * Capabilities for {@link Laverna}, allowing the user to override functionality.
 *
 * @typedef {Partial<AllLavernaCapabilities>} LavernaCapabilities
 */

/**
 * Factory for a {@link GetVersions} function.
 *
 * @callback GetVersionsFactory
 * @param {LavernaOptions} opts
 * @param {LavernaCapabilities} caps
 * @returns {GetVersions}
 */

/**
 * Function which resolves a list of the known versions of a package
 *
 * @callback GetVersions
 * @param {string} pkgName
 * @param {string} cwd
 * @returns {Promise<string[]>}
 * @this {Laverna}
 */

/**
 * Factory for a {@link InvokePublish} function.
 *
 * @callback InvokePublishFactory
 * @param {LavernaOptions} opts
 * @param {LavernaCapabilities} caps
 * @returns {InvokePublish}
 */

/**
 * Function which publishes a list of packages.
 *
 * Packages are expected to be workspaces in the current project.
 *
 * @callback InvokePublish
 * @param {string[]} pkgs
 * @returns {Promise<void>}
 * @this {Laverna}
 */

exports.Laverna = require('./laverna').Laverna

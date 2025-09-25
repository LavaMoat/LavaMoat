/**
 * Options for scuttling global properties
 */
export type LavaMoatScuttleOpts = {
  /** Whether scuttling is enabled or not. */
  enabled: boolean;
  /** List of properties to exclude from scuttling. */
  exceptions?: Array<string | RegExp>;
  /** Name of the scuttler function to use which is expected to be found as a property on the global object (e.g. if scuttlerName is 'x', scuttler function is obtained from globalThis['x']). */
  scuttlerName?: string;
}

/**
 * Reference to the global object
 */
export interface GlobalRef {
  globalThis?: Record<PropertyKey, unknown>;
}

/**
 * Scuttles (disables or restricts) certain global properties
 * @param globalRef The global object to scuttle
 * @param [opts] Options for scuttling
 */
export function scuttle(globalRef: GlobalRef, opts?: LavaMoatScuttleOpts | boolean): void;

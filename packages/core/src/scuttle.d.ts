/**
 * Options for scuttling global properties
 */
export interface ScuttleOpts {
  enabled: boolean;
  exceptions?: Array<string | RegExp>;
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
export function scuttle(globalRef: GlobalRef, opts?: ScuttleOpts | boolean): void;

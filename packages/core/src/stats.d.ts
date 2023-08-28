/**
 * Stat record for a particular module
 *
 * Provided to {@linkcode MakeInitStatsHookOptions.onStatsReady}
 */
export interface StatRecord {
  /**
   * Module ID
   */
  name: string;

  /**
   * Start time (in ms)
   */
  startTime: number;

  /**
   * Children, if any
   */
  children: StatRecord[];
  /**
   * Duration (in ms)
   */
  value?: number;

  /**
   * End time (in ms)
   */

  endTime?: number;
}

export interface TopLevelStatsRecord extends StatsRecord {
  /**
   * Stats API version
   *
   * @privateRemarks I guess?
   */
  version: 1;
}

/**
 * @internal
 */
export type ReportStatsHook = (
  event: "start" | "end",
  moduleId: string,
) => void;

/**
 * Options for `makeInitStatsHook`
 * @todo Move def of `onStatsReady` to kernel options
 */
export interface MakeInitStatsHookOptions {
  onStatsReady: (stats: TopLevelStatRecord) => void;
}

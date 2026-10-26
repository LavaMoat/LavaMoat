/**
 * Re-export {@link https://npm.im/consola consola}'s utility functions.
 *
 * This includes:
 *
 * - Colors
 * - ANSI escape code stripping
 * - Box drawing
 * - Text alignment
 * - Tree drawing
 *
 * Also included:
 *
 * - `terminal-link` for creating links in the terminal
 *
 * @packageDocumentation
 * @see {@link https://www.npmjs.com/package/terminal-link}
 */
export * from 'consola/utils'
export { default as terminalLink } from 'terminal-link'

/**
 * Wraps {@link https://www.npmjs.com/package/cli-spinner cli-spinner}; exports
 * {@link Spinner}.
 *
 * @packageDocumentation
 */

import * as spinner from 'cli-spinner'

export interface SpinnerOptions extends spinner.Options {
  /**
   * The characters to use for the spinner.
   */
  chars?: string[]

  /**
   * The delay between frames in milliseconds.
   *
   * @default 60
   */
  delay?: number
}

/**
 * Wrapper for {@link https://www.npmjs.com/package/cli-spinner cli-spinner}'s
 * {@link spinner.Spinner Spinner} class which allows granular control over
 * spinner characters (enabling ANSI formatting).
 */
export class Spinner extends spinner.Spinner {
  chars!: string[]

  constructor(options: spinner.Options & { chars?: string[]; delay?: number }) {
    super(options)
    if (options.chars?.length) {
      this.setChars(options.chars)
    }
    if (options.delay !== undefined) {
      this.setSpinnerDelay(options.delay)
    }
  }

  setChars(chars: string[]): this {
    this.chars = chars
    return this
  }
}

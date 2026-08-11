import { createConsola } from 'consola'

/**
 * @import {
 *   Decisions,
 *   DecisionsForOpinions
 * } from './types.js'
 */

const consola = createConsola({
  fancy: true,
  formatOptions: {
    colors: true,
    date: false,
  },
})

/** @type {(...args: unknown[]) => void} */
export const wizardPrint = (...args) => {
  // @ts-expect-error - typing this would be a waste of time.
  consola.info(...args)
}

/**
 * Creates a fallback decisions object that filters opinions by level.
 *
 * @param {object} options
 * @param {string} [options.packageManager]
 * @param {DecisionsForOpinions} [options.decisionsSnapshot]
 * @param {(decisions: DecisionsForOpinions) => Promise<void>} [options.saveDecisions]
 * @returns {Decisions}
 */
export function createWizard({
  packageManager,
  decisionsSnapshot,
  saveDecisions,
}) {
  const printed = new Set()
  /**
   * @param {string} text
   */
  const printOnce = (text) => {
    if (!printed.has(text)) {
      consola.info(text)
      printed.add(text)
    }
  }

  /** @type {DecisionsForOpinions} */
  const decisionsForOpinions = { ...(decisionsSnapshot ?? {}) }

  return {
    async packageManager() {
      if (packageManager) {
        return packageManager
      }
      return await consola.prompt(`Which package manager are you using?`, {
        type: 'select',
        options: ['npm', 'yarn', 'pnpm'],
        initial: packageManager,
      })
    },
    async shouldStart(scores) {
      consola.box({
        title: 'Harden Defaults Wizard',
        message: `This wizard will guide you through hardening your project.
The current state of recommendations is:
${[...scores.entries()]
  .map(
    ([key, [applied, total]]) =>
      `  - ${key}: ${applied.toPrecision(1)} / ${total}`
  )
  .join('\n')}
        `,
        style: {
          padding: 1,
          borderColor: 'magenta',
          borderStyle: 'double-single-rounded',
        },
      })
      return consola.prompt(`Would you like to continue?`, {
        type: 'confirm',
      })
    },
    async shouldApplyOpinion(opinion, _facts) {
      if (opinion.detected === 1) {
        consola.success(`[${opinion.level}] ${opinion.description}`)
        return true
      }
      if (opinion.id in decisionsForOpinions) {
        const decision = decisionsForOpinions[opinion.id]
        if (typeof decision === 'boolean') {
          return decision
        }
      }
      const decision = await consola.prompt(
        `[${opinion.level}] ${opinion.description}`,
        {
          type: 'confirm',
        }
      )
      decisionsForOpinions[opinion.id] = decision
      return decision
    },
    async chooseOpinion(opinion, _facts) {
      if (opinion.id in decisionsForOpinions) {
        const decision = decisionsForOpinions[opinion.id]
        if (typeof decision === 'string') {
          const matched = opinion.alternatives.find(
            (alt) => alt.id === decision
          )
          if (matched) {
            return matched
          }
        }
      }
      const index = await consola.prompt(`Which do you prefer?`, {
        type: 'select',
        options: opinion.alternatives.map((alt, index) => ({
          value: `${index}`,
          label: `[${alt.level}] ${alt.description}`,
        })),
      })
      const choice = opinion.alternatives[Number(index)]
      decisionsForOpinions[opinion.id] = choice.id
      return choice
    },
    async askToHarden({ description, id }) {
      if (id in decisionsForOpinions) {
        const decision = decisionsForOpinions[id]
        if (typeof decision === 'boolean') {
          return decision
        }
      }
      const decision = await consola.prompt(
        `[optional hardening] ${description}`,
        {
          type: 'confirm',
        }
      )
      decisionsForOpinions[id] = decision
      return decision
    },
    async shouldFollowupCommand(command, _facts) {
      printOnce(`Recommended follow-up command`)
      return consola.prompt(`Run: ${command}`, {
        type: 'confirm',
      })
    },
    async showSummary(summary) {
      if (saveDecisions) {
        await saveDecisions(decisionsForOpinions)
      }
      consola.box({
        title: 'Decisions Snapshot',
        message: JSON.stringify(decisionsForOpinions, null, 2),
        style: {
          padding: 1,
          borderColor: 'blue',
        },
      })
      consola.box({
        title: 'Harden Defaults Summary',
        message: summary,
        style: {
          padding: 1,
          borderColor: 'green',
          borderStyle: 'double-single-rounded',
        },
      })
      return { exitCode: 0 }
    },
  }
}

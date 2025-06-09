const { writeFileSync } = require('node:fs')

let level = 0
let startTime = 0
const recordThreshold = 3

/**
 * @param {Recording} a
 * @param {Recording} b
 * @returns {boolean}
 */
function equals(a, b) {
  return (
    a.to === b.to &&
    a.from === b.from &&
    a.label === b.label &&
    a.note === b.note
  )
}

/**
 * @typedef {Record<string, unknown> & {
 *   to: string
 *   label: string
 *   from?: string
 *   note?: boolean
 *   multiple?: boolean
 *   block?: boolean
 * }} Recording
 */
/** @type {Recording[]} */
const record = []

function collapseRecordings() {
  if (record.length < 3) {
    return
  }

  let i = 0
  while (i < record.length - 2) {
    // Check for repetition of 3 records
    if (
      i < record.length - 5 &&
      equals(record[i], record[i + 3]) &&
      equals(record[i + 1], record[i + 4]) &&
      equals(record[i + 2], record[i + 5])
    ) {
      record.splice(i + 3, 3)
      record[i].block = true
      record[i + 1].block = true
      record[i + 2].block = true
      continue
    }
    // Check for repetition of 2 records
    if (
      i < record.length - 3 &&
      equals(record[i], record[i + 2]) &&
      equals(record[i + 1], record[i + 3])
    ) {
      record.splice(i + 2, 2)
      record[i].block = true
      record[i + 1].block = true
      continue
    }
    i++
  }
}

/**
 * @param {Recording} item
 */
function recordWithCollapse(item) {
  const prev = record[record.length - 1]
  if (prev === undefined) {
    record.push(item)
    return
  }

  if (
    prev.to === item.to &&
    prev.from === item.from &&
    prev.note === item.note
  ) {
    if (prev.label === item.label) {
      prev.multiple = true
      return
    } else if (prev.to === 'STORE') {
      prev.label += `; ${item.label}`
      return
    }
    record.push(item)
  } else {
    record.push(item)
  }
}

module.exports = {
  set level(value) {
    level = value
  },
  get level() {
    return level
  },
  /**
   * Run the callback if verbosity is greater or equal given number
   *
   * @param {number} verbosity
   * @param {function} cb
   */
  run: (verbosity, cb) => {
    if (level >= verbosity) {
      return cb()
    }
  },

  /**
   * @param {number} verbosity
   * @param {any} content
   */
  rawDebug: (verbosity, content) => {
    if (level >= verbosity) {
      let prefix = '\n  >'
      if (level > 2) {
        const now = Date.now()
        if (!startTime) {
          startTime = now
        }
        prefix = `\n  [${now - startTime}] >`
      }
      // @ts-expect-error - trust me, the method exists
      process._rawDebug(prefix, content)
    }
  },

  /**
   * @param {readonly string[]} fields
   * @returns {void}
   */
  recordFields(fields) {
    if (level < recordThreshold) {
      return
    }
    fields = fields.filter(
      (f) => !['options', 'mainCompilationWarnings'].includes(f)
    )
    if (fields.length > 0) {
      record.push({
        from: 'plugin',
        to: 'STORE',
        label: `assert ${fields.join(';')}`,
      })
    }
  },
  /**
   * @template {Object} T
   * @param {T} STORE
   * @returns {T}
   */
  recordStore(STORE) {
    if (level < recordThreshold) {
      return STORE
    }
    record.push({ to: 'STORE', label: `set ${Object.keys(STORE).join('; ')}` })

    return new Proxy(STORE, {
      set(target, prop, val) {
        recordWithCollapse({ to: 'STORE', label: `set ${prop.toString()}` })
        Reflect.set(target, prop, val)
        return true
      },
    })
  },
  /**
   * @param {string} step
   */
  recordProgress(step) {
    if (level < recordThreshold) {
      return
    }
    record.push({ note: true, to: 'plugin', label: `progress ${step}` })
  },

  /**
   * @param {string} name
   */
  recordHook(name) {
    if (level < recordThreshold) {
      return
    }
    recordWithCollapse({
      from: 'webpack',
      to: 'plugin',
      label: `hook call: ${name}`,
    })
  },
  /**
   * @template T
   * @param {string} name
   * @param {Promise<T>} promise
   * @returns {Promise<T>}
   */
  recordWorkAsync(name, promise) {
    if (level >= recordThreshold) {
      record.push({ from: 'plugin', to: 'plugin', label: name })
      const t0 = Date.now()
      promise.finally(() => {
        module.exports.rawDebug(2, ` [${Date.now() - t0}ms]  ${name}`)
      })
    }
    return promise
  },
  /**
   * @template {unknown} T
   * @param {string} name
   * @param {function(): T} fn
   * @returns {T}
   */
  recordWorkSync(name, fn) {
    if (level >= recordThreshold) {
      const t0 = Date.now()
      const ret = fn()
      module.exports.rawDebug(2, ` [${Date.now() - t0}ms]  ${name}`)
      recordWithCollapse({ from: 'plugin', to: 'plugin', label: name })
      return ret
    } else {
      return fn()
    }
  },
  /**
   * @param {string} name
   */
  recordWork(name) {
    if (level >= recordThreshold) {
      recordWithCollapse({ from: 'plugin', to: 'plugin', label: name })
    }
  },

  endRecording() {
    // mermaid sequence diagram out of the entries in record
    if (level < recordThreshold || record.length === 0) {
      return
    }
    collapseRecordings()
    const diagram = ['```mermaid', 'sequenceDiagram\n']
    let active = 'plugin'
    diagram.push(`webpack->>plugin: apply()`)
    let inABlock = false

    record.forEach((entry) => {
      if (entry.note) {
        diagram.push(`Note over ${entry.to}: ${entry.label}`)
      } else {
        if (entry.block && inABlock === false) {
          diagram.push(`loop Many times`)
          inABlock = true
        } else if (!entry.block && inABlock) {
          diagram.push(`end`)
          inABlock = false
        }
        const from = entry.from || active
        active = entry.to
        if (entry.multiple) {
          entry.label = `(many times) ${entry.label}`
        }
        diagram.push(
          `${inABlock ? '  ' : ''}${from}->>${entry.to}: ${entry.label.replace(/;/g, '<br>')}`
        )
      }
    })
    diagram.push('```')
    writeFileSync('diagram.md', diagram.join('\n'))
  },
}

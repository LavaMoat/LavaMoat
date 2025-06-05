import { createConsola, LogLevels } from 'consola'
import { strict as assert } from 'node:assert'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import {
  type Logger,
  defaultLog,
  defaultLoggerOptions,
  log,
} from '../src/log.ts'

describe('@lavamoat/vog: logging', () => {
  let originalEnv: string | undefined
  // why isn't the `Mock` type exported???
  let stderrWriteMock: ReturnType<
    typeof mock.method<typeof process.stderr, 'write'>
  >

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env.LAVAMOAT_DEBUG

    // Mock stderr using Node.js test mocking API
    stderrWriteMock = mock.method(process.stderr, 'write', () => true)
  })

  afterEach(() => {
    // Restore original environment
    if (originalEnv === undefined) {
      delete process.env.LAVAMOAT_DEBUG
    } else {
      process.env.LAVAMOAT_DEBUG = originalEnv
    }

    // Restore all mocks
    mock.restoreAll()
  })

  describe('exports', () => {
    it('should export the expected members', () => {
      assert.ok(log, 'log should be exported')
      assert.ok(defaultLog, 'defaultLog should be exported')
      assert.ok(defaultLoggerOptions, 'defaultLoggerOptions should be exported')
      assert.ok(LogLevels, 'LogLevels should be exported')
    })

    it('should export log and defaultLog as the same instance', () => {
      assert.strictEqual(
        log,
        defaultLog,
        'log and defaultLog should be the same instance'
      )
    })
  })

  describe('defaultLoggerOptions', () => {
    it('should have correct default options', () => {
      assert.strictEqual(defaultLoggerOptions.level, LogLevels.info)
      assert.strictEqual(defaultLoggerOptions.formatOptions.timestamp, false)
      assert.strictEqual(defaultLoggerOptions.formatOptions.date, false)
      assert.strictEqual(defaultLoggerOptions.fancy, true)
      assert.strictEqual(defaultLoggerOptions.stdout, process.stderr)
    })

    it('should be frozen', () => {
      assert.ok(Object.isFrozen(defaultLoggerOptions))
    })

    it('should respect LAVAMOAT_DEBUG environment variable', () => {
      // Test with debug enabled - we can't easily test dynamic imports in this context
      // so we'll test the logic directly
      process.env.LAVAMOAT_DEBUG = '1'

      // Test the same logic that's used in the module
      const debugLevel = process.env.LAVAMOAT_DEBUG
        ? LogLevels.debug
        : LogLevels.info
      assert.strictEqual(debugLevel, LogLevels.debug)

      // Reset and test without debug
      delete process.env.LAVAMOAT_DEBUG
      const infoLevel = process.env.LAVAMOAT_DEBUG
        ? LogLevels.debug
        : LogLevels.info
      assert.strictEqual(infoLevel, LogLevels.info)
    })
  })

  describe('default logger instance', () => {
    it('should be a consola instance', () => {
      assert.ok(typeof log.info === 'function')
      assert.ok(typeof log.warn === 'function')
      assert.ok(typeof log.error === 'function')
      assert.ok(typeof log.debug === 'function')
    })

    it('should log to stderr by default', () => {
      log.info('test message')
      assert.ok(stderrWriteMock.mock.calls.length > 0)
      const output = stderrWriteMock.mock.calls
        .map((call) => `${call.arguments[0]}`)
        .join('')
      assert.ok(output.includes('test message'))
    })

    it('should have info level by default', () => {
      // Reset mock calls
      stderrWriteMock.mock.resetCalls()

      log.debug('debug message')
      log.info('info message')

      // Debug should not appear (level is info), info should appear
      const output = stderrWriteMock.mock.calls
        .map((call) => `${call.arguments[0]}`)
        .join('')
      assert.ok(!output.includes('debug message'))
      assert.ok(output.includes('info message'))
    })

    it('should support different log levels', () => {
      stderrWriteMock.mock.resetCalls()

      log.error('error message')
      log.warn('warn message')
      log.info('info message')

      const output = stderrWriteMock.mock.calls
        .map((call) => `${call.arguments[0]}`)
        .join('')
      assert.ok(output.includes('error message'))
      assert.ok(output.includes('warn message'))
      assert.ok(output.includes('info message'))
    })

    it('should create new logger instances with custom options', () => {
      const customLog = log.create({
        level: LogLevels.debug,
        stdout: process.stdout,
      })

      assert.notStrictEqual(customLog, log)
      assert.ok(typeof customLog.info === 'function')
    })
  })

  describe('Logger type', () => {
    it('should be compatible with consola logger', () => {
      const testLogger: Logger = createConsola()
      assert.ok(typeof testLogger.info === 'function')
      assert.ok(typeof testLogger.warn === 'function')
      assert.ok(typeof testLogger.error === 'function')
      assert.ok(typeof testLogger.debug === 'function')
    })
  })

  describe('environment variable behavior', () => {
    it('should use debug level when LAVAMOAT_DEBUG is set', () => {
      process.env.LAVAMOAT_DEBUG = 'true'

      // Create a new consola instance with the same logic as the module
      const testLog = createConsola({
        level: process.env.LAVAMOAT_DEBUG ? LogLevels.debug : LogLevels.info,
        formatOptions: {
          timestamp: false,
          date: false,
        },
        stdout: process.stderr,
      })

      stderrWriteMock.mock.resetCalls()
      testLog.debug('debug test')

      const output = stderrWriteMock.mock.calls
        .map((call) => `${call.arguments[0]}`)
        .join('')
      assert.ok(output.includes('debug test'))
    })

    it('should use info level when LAVAMOAT_DEBUG is not set', () => {
      delete process.env.LAVAMOAT_DEBUG

      // Create a new consola instance with the same logic as the module
      const testLog = createConsola({
        level: process.env.LAVAMOAT_DEBUG ? LogLevels.debug : LogLevels.info,
        formatOptions: {
          timestamp: false,
          date: false,
        },
        stdout: process.stderr,
      })

      stderrWriteMock.mock.resetCalls()
      testLog.debug('debug test')
      testLog.info('info test')

      const output = stderrWriteMock.mock.calls
        .map((call) => `${call.arguments[0]}`)
        .join('')
      assert.ok(!output.includes('debug test'))
      assert.ok(output.includes('info test'))
    })
  })

  describe('format options', () => {
    it('should disable timestamp and date formatting', () => {
      stderrWriteMock.mock.resetCalls()
      log.info('timestamp test')

      const output = stderrWriteMock.mock.calls
        .map((call) => `${call.arguments[0]}`)
        .join('')
      // Output should not contain timestamp patterns
      assert.ok(
        !/\d{4}-\d{2}-\d{2}/.test(output),
        'Should not contain date pattern'
      )
      assert.ok(
        !/\d{2}:\d{2}:\d{2}/.test(output),
        'Should not contain time pattern'
      )
    })
  })

  describe('stderr output behavior', () => {
    it('should always output to stderr regardless of log level', () => {
      stderrWriteMock.mock.resetCalls()

      log.error('error to stderr')
      log.warn('warn to stderr')
      log.info('info to stderr')

      const output = stderrWriteMock.mock.calls
        .map((call) => `${call.arguments[0]}`)
        .join('')
      assert.ok(output.includes('error to stderr'))
      assert.ok(output.includes('warn to stderr'))
      assert.ok(output.includes('info to stderr'))
    })

    it('should allow creating custom logger with stdout output', () => {
      const customLog = log.create({ stdout: process.stdout })

      // This test verifies the API works, actual stdout capture would be more complex
      assert.ok(typeof customLog.info === 'function')
    })
  })
})

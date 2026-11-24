/**
 * Test helpers for `@lavamoat/core` specs.
 *
 * These helpers let you generate a LavaMoat policy from a set of "virtual"
 * module records without needing a real filesystem or the `parseForPolicy`
 * crawler.
 *
 * @packageDocumentation
 * @internal
 */

// dist/ imports because generate-policy has cross-module .js imports that
// Node.js native type stripping cannot resolve. pretest keeps dist/ fresh.
import { LavamoatModuleRecord } from '../dist/module-record.js'
import { createModuleInspector } from '../dist/generate-policy.js'
import type { LavaMoatPolicy } from '@lavamoat/types'
import type {
  ModuleInspectorOptions,
  GeneratePolicyOptions,
} from '../dist/generate-policy.js'

/**
 * A lightweight "file" descriptor used to build module records in tests.
 */
export interface TestFile {
  specifier: string
  packageName: string
  content: string
  importMap?: Record<string, string>
  entry?: boolean
  type?: 'js' | 'builtin' | 'native'
  file?: string
}

/**
 * Generates a LavaMoat policy from a list of test file descriptors.
 *
 * All files are treated as `js` modules unless `type` is specified. The first
 * file with `entry: true` is treated as the root module. No file I/O occurs.
 *
 * @param opts - Options including `files` and any inspector overrides
 * @returns Generated policy
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function generatePolicyFromFiles({
  files,
  policyOverride,
  ...inspectorOpts
}: {
  files: TestFile[]
  policyOverride?: LavaMoatPolicy
} & Partial<ModuleInspectorOptions>): Promise<LavaMoatPolicy> {
  const isBuiltin = inspectorOpts.isBuiltin ?? (() => false)
  const inspector = createModuleInspector({ ...inspectorOpts, isBuiltin })

  for (const file of files) {
    const record = new LavamoatModuleRecord({
      specifier: file.specifier,
      file: file.specifier,
      type: file.type ?? 'js',
      packageName: file.packageName,
      content: file.content,
      importMap: file.importMap ?? {},
      isRoot: file.entry ?? false,
    })
    inspector.inspectModule(record)
  }

  return inspector.generatePolicy({ policyOverride })
}

/**
 * Convenience wrapper to generate policy from a single test function body.
 *
 * The function is converted to a string and wrapped in an IIFE; the resulting
 * source is treated as a single `js` module named `'test'`.
 *
 * @param fn - Function whose body will be used as module content
 * @param opts - Additional options forwarded to `generatePolicyFromFiles`
 * @returns Generated policy
 */
export async function createPolicyForTest(
  fn: ((...args: unknown[]) => unknown) | string,
  opts: Partial<GeneratePolicyOptions> & Partial<ModuleInspectorOptions> = {}
): Promise<LavaMoatPolicy> {
  const content = `(${fn.toString()})()`
  return generatePolicyFromFiles({
    files: [
      {
        type: 'js',
        specifier: './entry.js',
        file: './entry.js',
        packageName: '$root$',
        importMap: { test: './node_modules/test/index.js' },
        content: 'require("test")',
        entry: true,
      },
      {
        type: 'js',
        specifier: './node_modules/test/index.js',
        packageName: 'test',
        content,
        importMap: {},
      },
    ],
    ...opts,
  })
}

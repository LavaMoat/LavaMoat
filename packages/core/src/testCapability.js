const assert = require('node:assert')
const fs = require('node:fs')
const endowmentsToolkit = require('./endowmentsToolkit')
require('ses')

module.exports = function testCapability(capabilitySpecifier) {
  const subject = require(capabilitySpecifier)

  assert.strictEqual(
    Array.isArray(subject),
    true,
    'default export from capability specifier must be an array of capabilities'
  )

  subject.forEach((capabilityDefinition) => {
    assert.strictEqual(
      typeof capabilityDefinition,
      'object',
      'each capability definition must be an object'
    )
    assert.ok(Array.isArray(capabilityDefinition.names))
    assert.strictEqual(typeof capabilityDefinition.file, 'string')
  })

  const { repairs, capabilities } = endowmentsToolkit.evaluateCapabilities({
    sources: subject.map(({ file }) => fs.readFileSync(file, 'utf8')),
    globalRef: globalThis,
  })

  repairIntrinsics()
  repairs.forEach((repair) => repair())

  const rootCompartmentGlobalThis = new Compartment().globalThis
  const compartmentGlobalThis = new Compartment().globalThis

  subject.forEach(({ tests = [] }) => {
    tests.forEach(({ name, options, assertion }) => {
      const capability = capabilities.get(name)
      assert.ok(capability, `capability "${name}" was not registered`)

      const endowments = {}
      capability.endow({
        options,
        endowments,
        compartmentGlobalThis,
        rootCompartmentGlobalThis,
      })
      assertion(
        { endowments, compartmentGlobalThis, rootCompartmentGlobalThis },
        assert
      )
    })
  })
}

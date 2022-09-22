module.exports = (yargs, defaults) => {
  // the path for the policy file
  yargs.option('policy', {
    alias: ['p', 'policyPath'],
    describe: 'Pass in policy. Accepts a filepath string to the existing policy. When used in conjunction with --autopolicy, specifies where to write the policy. Default: ./lavamoat/node/policy.json',
    type: 'string',
    default: defaults.policyPath
  })
  // the path for the policy override file
  yargs.option('policyOverride', {
    alias: ['o', 'override', 'policyOverridePath'],
    describe: 'Pass in override policy. Accepts a filepath string to the existing override policy. Default: ./lavamoat/node/policy-override.json',
    type: 'string',
    default: defaults.policyOverridePath
  })
  // the path for the policy debug file
  yargs.option('policyDebug', {
    alias: ['pd', 'policydebug', 'policyDebugPath'],
    describe: 'Pass in debug policy. Accepts a filepath string to the existing debug policy. Default: ./lavamoat/node/policy-debug.json',
    type: 'string',
    default: defaults.policyDebugPath
  })
  // parsing mode, write policy to policy path
  yargs.option('writeAutoPolicy', {
    alias: ['a', 'autopolicy'],
    describe: 'Generate a "policy.json" and "policy-override.json" in the current working         directory. Overwrites any existing policy files. The override policy is for making manual policy changes and always takes precedence over the automatically generated policy.',
    type: 'boolean',
    default: defaults.writeAutoPolicy
  })
  // parsing + run mode, write policy to policy path then execute with new policy
  yargs.option('writeAutoPolicyAndRun', {
    alias: ['ar', 'autorun'],
    describe: 'parse + generate a LavaMoat policy file then execute with the new policy.',
    type: 'boolean',
    default: defaults.writeAutoPolicyAndRun
  })
  // parsing mode, write policy debug info to specified or default path
  yargs.option('writeAutoPolicyDebug', {
    alias: ['dp', 'debugpolicy'],
    describe: 'when writeAutoPolicy is enabled, write policy debug info to specified or default path',
    type: 'boolean',
    default: defaults.writeAutoPolicyDebug
  })
  // parsing mode, write policy debug info to specified or default path
  yargs.option('projectRoot', {
    describe: 'specify the director from where packages should be resolved',
    type: 'string',
    default: defaults.projectRoot
  })
  // debugMode, disable some protections for easier debugging
  yargs.option('debugMode', {
    alias: ['d', 'debug'],
    describe: 'Disable some protections and extra logging for easier debugging.',
    type: 'boolean',
    default: defaults.debugMode
  })
  // log initialization stats
  yargs.option('statsMode', {
    alias: ['stats'],
    describe: 'enable writing and logging of stats',
    type: 'boolean',
    default: defaults.statsMode
  })
}
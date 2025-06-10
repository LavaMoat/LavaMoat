const dumbPolyfillExposedInternals = Object.entries(Promise).filter(
  function (entry) {
    return !!entry[1] && entry[0].startsWith('_')
  }
)

// eslint-disable-next-line no-undef
repairIntrinsics({
  errorTaming: 'unsafe',
  consoleTaming: 'unsafe',
  errorTrapping: 'none',
  unhandledRejectionTrapping: 'none',
  overrideTaming: 'severe',
  stackFiltering: 'verbose',
  evalTaming: 'unsafe-eval',
})

// Hermes specific repairs or shims that need to exist before everything is frozen belong here:

// Hermes built-in implementation of Promise is using this global field internally to hold on to a noop function :|
Object.assign(Promise, Object.fromEntries(dumbPolyfillExposedInternals))

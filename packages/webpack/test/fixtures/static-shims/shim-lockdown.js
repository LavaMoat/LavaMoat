LOCKDOWN_SHIM = function addSESGlobals() {
  // Prove it's possible to shim between repairs and hardening
  globalThis.Promise.LOCKDOWN_SHIM_WORKS = true
}

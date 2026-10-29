// Capability that uses repair() to mutate globalThis before hardening.
let marker

repair((realGlobalThis) => {
  // This runs between repairIntrinsics() and hardenIntrinsics()
  realGlobalThis.__capRepairRan = true
  marker = 'repaired'
})

defineCapability('repair-marker', {
  ambient: false,
  endow({ endowments }) {
    endowments.__repairMarker = marker
  },
})

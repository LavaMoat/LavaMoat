let dryRun = false
module.exports = {
  isDryRun: () => dryRun,
  setDryRun: (v) => {
    if (dryRun && !v) {
      throw Error('Can not undo switching to dry-run')
    }
    dryRun = !!v
  },
  performEffect: (description, effectFunc) => {
    if (dryRun === false) {
      return effectFunc()
    } else {
      console.log(`dry run, skipping ${description}`)
    }
  },
  resetDryRunIKnowWhatImDoing: () => (dryRun = false),
}

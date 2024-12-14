// polyfill for Promise.catch can't be applied on a frozen prototype
Promise.prototype.catch = function (onRejected) {
  console.log('Use of polyfill for Promise.prototype.catch')
  return this.then(undefined, onRejected)
}

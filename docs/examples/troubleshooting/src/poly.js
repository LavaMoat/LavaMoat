require('@example/polyfill')

Promise.reject('foo!').catch((err) => {
  console.error('Promise rejected:', err)
})

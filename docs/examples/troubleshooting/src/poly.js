require('@example/polyfill')

Promise.reject('foo!').catch((err) => {
  console.info('Promise rejected:', err)
})

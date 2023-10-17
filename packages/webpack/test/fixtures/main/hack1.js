if (!FLAG) {
  throw Error(
    'The hack test depends on FLAG being in the global scope. Make sure your test is instrumented with the FLAG in vm context',
  )
}

require('loader-hack')

const browserify = require('browserify')
const through2 = require('through2').obj

const bundler = browserify([])

bundler.on('bundle', () => {

  bundler.pipeline.get('json').write({
    id: './b.js',
    file: './b.js',
    // basedir: undefined,
    // entry: true,
    // expose: false,
    source: `console.log(typeof global)`,
    deps: {},
    // order: 0
  })

  bundler.pipeline.get('json').write({
    id: './a.js',
    file: './a.js',
    basedir: undefined,
    entry: true,
    expose: false,
    source: `require('b')`,
    deps: { b: './b.js' },
    // order: 0
  })
})

bundler.bundle()
.pipe(process.stdout)

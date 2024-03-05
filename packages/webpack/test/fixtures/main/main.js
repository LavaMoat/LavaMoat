import { hello as helloCommonJS } from 'commonjs-package'
import { re } from 'commonjs-quirks'
import { hello as helloES6 } from 'es6-module-package'
import globals from 'globals-package'
import 'side-effects-package/styles.css'
import { hello as helloTypeScript } from 'typescript-package'
import { hello as helloUMD } from 'umd-package'
import { what } from './src/hello.ts'
import { thing } from './src/other.mjs'

// deliberately unused
import './src/style.css'

function run() {
  console.log(
    helloCommonJS(),
    JSON.stringify(re),
    helloES6(),
    helloTypeScript(),
    helloUMD(),
    thing(),
    what,
    globals
  )
}

run()

import { hello as helloCommonJS } from 'commonjs-package'
import { hello as helloES6 } from 'es6-module-package'
import 'side-effects-package/styles.css'
import { hello as helloTypeScript } from 'typescript-package'
import { hello as helloUMD } from 'umd-package'
import { thing } from './src/other.mjs'
import { what } from './src/hello.ts'
// deliberately unused
import { treeshakeable } from './src/treeshakeable.mjs'
import './src/style.css'

function run() {
  console.log(
    helloCommonJS(),
    helloES6(),
    helloTypeScript(),
    helloUMD(),
    thing(),
    what,
  )
}

run()

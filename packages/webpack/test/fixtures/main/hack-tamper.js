import 'tampering-hack'
import { hello as helloGetter } from 'commonjs-quirks/gottalovegetters.js'
import { hello as helloCommonJS } from 'commonjs-package'
import { hello as helloES6 } from 'es6-module-package'
import { hello as helloTypeScript } from 'typescript-package'
import { hello as helloUMD } from 'umd-package'

function run() {
  console.log(
    helloCommonJS(),
    helloES6(),
    helloTypeScript(),
    helloUMD(),
    helloGetter()
  )
}

run()

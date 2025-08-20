import { hello as helloCommonJS } from 'commonjs-package'
import { re } from 'commonjs-quirks'
import { hello as helloES6 } from 'es6-module-package'
import globals from 'globals-package'
import 'resource-hack'
import 'side-effects-package/styles.css'
import { hello as helloTypeScript } from 'typescript-package'
import { hello as helloUMD } from 'umd-package'
import { slop as slop1 } from './slop/index.js'
import { what } from './src/hello.ts'
import { slop as slop2 } from './src/moreslop/index.js'
import { thing } from './src/other.mjs'

// This is a webpack feature where the file referenced here is included in the
// dist as an asset. LavaMoat plugin allows this in app, but not in packages.
const x = new URL('./src/ambientasset.html', import.meta.url)

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
    globals,
    slop1,
    slop2
  )
}

run(x)

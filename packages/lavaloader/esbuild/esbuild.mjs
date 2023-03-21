
// TODO: fill this in with loading the files and wrapping them
import * as esbuild from 'esbuild'

let lavaMoatPlugin = {
  name: 'LavaMoat',
  setup(build) {
    build.onLoad({ filter: /\.js/ }, () => ({
      contents: ,
      loader: 'js',
    }))
    build.onLoad({ filter: /\.ts/ }, () => ({
      contents: ,
      loader: 'ts',
    }))
  },
}

await esbuild.build({
  entryPoints: ['app.js'],
  bundle: true,
  outfile: 'out.js',
  plugins: [lavaMoatPlugin],
})
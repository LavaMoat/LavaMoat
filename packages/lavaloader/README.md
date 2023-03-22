# LavaLoader PoC

## webpack

run `yarn` and `yarn lib:ses` in the lavaloader folder before you begin

`cd app`  
run `npm ci`  
run `npm test` to trigger the build  
open test.html in the browser and look at the console

Note: something is off with error taming, because the message is null ever since I introduced lockdown. 

Problems:
1. If anything runs after our loader it could undo some protections.
   That includes plugins, although the likelyhood of them changing the containment is low.
    We can document that and put the burden on the end user, or build something to ensure the integrity is maintained.
    - A package that attempts all basic escape techniques that gets added to the bundle could be our last line of defense. 


## esbuild

esbuild loader doesn't work correctly yet. 

`cd app-esbuild`  
run `npm ci`  
run `npm test` to trigger the build   
read the file dist/app.bundle.js

Problems:
1. esbuild processes module declarations and wires things up after the loader runs. Instead of just providing our loader, we'd have to provide our own esm->cjs transform. the demo works on cjs files and only supports cjs typescript if we turn off checking for valid javascript - since the source we're reading may not be valid javascript.
2. esbuild generates unique names for functions returning the module namespace, so wrapping them with the `runtimeHandler` is not possible. We'd have to do additional post-processing on the bundle or find a way to trigger different behavior from esbuild.


# lavamoat-node express example

### compatibility note

This currently requires a workaround via `patch-package`. The workaround is applied automatically.
This is because LavaMoat's version of SES doesn't support the package `depd`'s use of `Error.prepareStackTrace`.

### story

##### chapter 1: the pledge

we're writing a server with express
```bash
yarn
cat index.js
```

we pull in a useful utility, some express middleware.
```s
yarn add bad-idea-express-backdoor@^1.0.0
```

since we are worried about evil dependencies, we use lavamoat.
lets automatically generate a config
```bash
npx lavamoat index.js --writeAutoConfig
cat lavamoat-config.json | jq . -C | less
```

lets take it for a spin
```bash
npx lavamoat index.js
# server listening on 8080
```

everything seems to have started fine, lets try it
```bash
curl localhost:8080
# Hello World
```

ok, everything working as expected.
life continues


##### chapter 2: the turn

so far so good.
we learned that our middleware has a new version, lets upgrade it

```s
yarn add bad-idea-express-middleware@^2.0.0
```

now lets start up the app again
```bash
npx lavamoat index.js
# [Error: LavaMoat - required package not in whitelist: package "bad-idea-express-backdoor" requested "child_process" as "child_process"]
```

hmm, seems the new version changes its dependencies.
we can easily regenerate the config
```
npx lavamoat index.js --writeAutoConfig
git diff lavamoat-config.json
```

we can see `bad-idea-express-backdoor` added new package dependencies.
```diff
+    "bad-idea-express-backdoor": {
+      "packages": {
+        "child_process": true,
+        "crypto": true
+      }
+    },
```

strange, why does our middleware need `child_process`?
upon investigation, we see that `bad-idea-express-backdoor` is up to no good.
```bash
cat node_modules/bad-idea-express-backdoor/index.js | grep evil
#  // Do the evil part
```

just for fun, lets try that evil out.
start the server with the new config
```bash
npx lavamoat index.js
```

in another terminal, send uri-encoded commands to the backdoor. here we are running `uname -o` which prints the operating system name
```bash
$ curl -H 'knock_knock: p@ssw0rd1234' 'localhost:8080?cmd=uname%20-o'
# {
#   "err": null,
#   "stdout": "GNU/Linux\n",
#   "stderr": ""
# }%
```

we've discovered the attack.
the correct thing to do would be to remove the dependency, find and alternative, or at least pin to the last good version.
but we're not going to do that.

let's keep it, as a pet.


##### chapter 3: the prestige

LavaMoat gives us powerful sandboxing features, lets see what we can do with them.

(to be continued...)
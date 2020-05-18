# lavamoat-node express example

This tutorial is based on https://snyk.io/blog/what-is-a-backdoor/

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

as you can see, we have added some useful express middleware.
```js
const usefulMiddleware = require('bad-idea-express-backdoor')
```

since we are worried about evil dependencies, we use lavamoat.
lets automatically generate a config and take a look
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
cat node_modules/bad-idea-express-backdoor/index.js | grep -C 10 'Do the evil part'
#  // Do the evil part
```

just for fun, lets try that evil out.
start the server with the new config
```bash
npx lavamoat index.js
```

in another terminal, send uri-encoded commands to the backdoor. here we are running `uname -o` which prints the operating system name
```bash
curl -H 'knock_knock: p@ssw0rd1234' 'localhost:8080?cmd=uname%20-o'
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

1. disable

Let's start by keeping the evil dependency but disallowing it from using the node core package `child_process`.

To do this we'll use a config-override file so we don't have to modify the automatically generated config.

```bash
cp chapter3/override-0.json lavamoat-config-override.json
cat lavamoat-config-override.json | jq
```

Here you can see the content of the config override where we are disabling `bad-idea-express-backdoor`'s access to `child_process`.
```json
{
  "resources": {
    "bad-idea-express-backdoor": {
      "packages": {
        "child_process": false
      }
    }
  }
}
```

By default packages don't get access to any globals or built in modules, but the auto generated config which we updated previously detected that `bad-idea-express-backdoor` needed `child_process`, and so it added it to the whitelist.
This is why its improtant to review the auto generated config.

```bash
cat lavamoat-config.json | jq '.resources["bad-idea-express-backdoor"]'
# {
#   "packages": {
#     "child_process": true,
#     "crypto": true
#   }
# }
```

Ok, lets take it for a spin!
LavaMoat knows to check for a file named `lavamoat-config-override.json` and merges it over `lavamoat-config.json`.

```bash
npx lavamoat index.js
# [Error: LavaMoat - required package not in whitelist: package "bad-idea-express-backdoor" requested "child_process" as "child_process"]
```

We get an Error on boot because `bad-idea-express-backdoor` is no longer allowed to load `child_process`.
This is good, but not exactly what we wanted.

2. empty

Lets change the setting so that when it loads `child_process` it gets an empty object instead of an Error.

```bash
cp chapter3/override-1.json lavamoat-config-override.json
cat lavamoat-config-override.json | jq
```

3. replace


Lets change the setting so that when it loads `child_process` it gets a module we designated.

```bash
cp chapter3/override-2.json lavamoat-config-override.json
cat lavamoat-config-override.json | jq
```
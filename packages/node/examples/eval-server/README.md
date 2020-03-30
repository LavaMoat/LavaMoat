# examples/eval-server

this example showcases how `lavamoat` can help reduce the danger of using certain packages

### unsafe: running in vanilla node

running the example normally can be dangerous.
this runs the `bad-idea-eval-server` package that will eval code passed to it, and return the result.
Since this is run under normal node.js, anything is exposed to the eval-server.

start the server
```bash
yarn start:dangerous
```

interact with the server (from another process)

environment vars are exposed
```bash
curl -d "Object.keys(process.env).length" localhost:8080
# 105
```

filesystem is accessible via "fs"
```bash
curl -d "typeof require('fs').readFileSync" localhost:8080
# function
```

### safer: running in lavamoat

this example runs the `bad-idea-eval-server` inside of the lavamoat kernel.
While it can still perform an eval, the eval behaves as an indirect eval and the execution environment is constrained as SES.


start the server
```bash
yarn start:dangerous
```

interact with the server (from another process)

environment vars are exposed
```bash
curl -d 'Object.keys(process.env).length' localhost:8080
# process is not defined
```

filesystem is accessible via "fs"
```bash
curl -d "typeof require('fs').readFileSync" localhost:8080
# require is not defined
```

denial of service attacks are still possible
```bash
curl -d "while (true) {}" localhost:8080
# ... (server hangs)
```


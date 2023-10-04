### explanation

This is EXACTLY the same as [01-simple-js example](../01-simple-js), but with scuttleGlobalThis security feature turned on:

```javascript
// configure LavaMoat
const lavamoatOpts = {
  writeAutoPolicy: false,
  scuttleGlobalThis: {
    enabled: true, // enable scuttling https://github.com/LavaMoat/LavaMoat/pull/360
    exceptions: ['prompt'], // scuttle all properties except for "prompt"
    scuttlerName: 'SCUTTLER', // configure an external property to pass scuttling processing to
  },
}
```

You can see in [index.html](./index.html) a script tag that configures the `SCUTTLER` property as an external property to be called by LavaMoat
when scuttling takes place.
So when scuttling should take place, instead it is being passed on to the function referred by `globalThis['SCUTTLER']` which decides for itself when and how to execute the scuttling process.

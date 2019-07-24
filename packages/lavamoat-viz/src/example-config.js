module.exports = {
  "resources": {
    "<root>": {
      "modules": {
        "sesify-example-deep": true,
        "sesify-example-format": true
      }
    },
    "sesify-example-deep": {
      "globals": {
        "console.warn": true,
        "localStorage": true
      },
      "modules": {
        "sesify-example-fetch": true
      }
    },
    "sesify-example-fetch": {
      "globals": {
        "fetch": true
      }
    },
    "sesify-example-format": {
      "globals": {
        "console.warn": true,
        "fetch": true,
        "localStorage": true
      }
    }
  }
}
process.on('unhandledRejection', error => {
  debugger
  // Will print "unhandledRejection err is not defined"
  console.log('unhandledRejection', error.message);
});


require('./basic')
require('./config')
require('./attacks')
require('./inspectEnvironment')
require('./generateConfig')
require('./sourcemaps')
require('./globalRef')
require('./moduleExports')
require('./globalWrites')
require('./exportsDefense')
require('./circularDeps')
require('./endowments')
require('./pluginOpts')
require('./transforms')

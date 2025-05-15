const {
  notifyParent,
  notifyTop,
  notifyOpener,
  abuseGlobals,
} = require('postmessage-lib')

abuseGlobals()

notifyTop('Hello from the child frame')
notifyParent('Hello from the child frame with target', 'http://localhost:8080')
notifyOpener('Hello from the popup')

if (window.opener) {
  alert('I have an opener')
}

// Entry for the capability e2e test.
// Uses globals-package (which has console access) then logs its own message.
import 'globals-package'
console.log('hello from cap-logging')
console.log(
  'repair-marker:',
  typeof __repairMarker !== 'undefined' ? __repairMarker : 'missing'
)

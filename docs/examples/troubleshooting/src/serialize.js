const override = require('@example/override')

// Example usage of override package
const user = new override.UserProfile('John Doe', 25)
user.greet()
user.displayProfile()

const serializedUser = override.serializeUser(user)
console.log('Serialized User:', serializedUser)

const deserializedUser = override.deserializeUser(serializedUser)
console.log('Deserialized User:', deserializedUser)

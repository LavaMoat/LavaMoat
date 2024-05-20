// Base class for entities in the application
class Entity {
  constructor(name) {
    this.name = name
  }

  greet() {
    console.log(`Hello, my name is ${this.name}!`)
  }
}

// Specific class for user profiles
class UserProfile extends Entity {
  constructor(name, age) {
    super(name)
    this.age = age
  }

  displayProfile() {
    console.log(`Name: ${this.name}, Age: ${this.age}`)
  }
}

// Simulating a deserialization function that assigns constructors based on type
// This is a very naive implementation just to show an example, don't do that.
function deserializeUser(serializedObject) {
  let obj = JSON.parse(serializedObject)
  switch (obj.type) {
    case 'UserProfile':
      // Directly setting the constructor property
      obj.constructor = UserProfile
      obj.__proto__ = UserProfile.prototype
      delete obj.type
      break
    default:
      throw new Error('Unknown type for deserialization')
  }
  return obj
}

const serializeUser = (user) => {
  // check if user is UserProfile type
  if (!(user instanceof UserProfile)) {
    throw new Error('User must be an instance of UserProfile')
  }
  return JSON.stringify({ ...user, type: 'UserProfile' })
}

module.exports = {
  UserProfile,
  deserializeUser,
  serializeUser,
}

export interface User {
  name: string
  age: number
}

export function formatUser(user: User): string {
  return `${user.name} (${user.age})`
}

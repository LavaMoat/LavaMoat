import { parseArgs } from 'node:util'

const args = parseArgs({
  allowPositionals: true,
  strict: false,
  options: {
    yelling: {
      type: 'boolean',
    },
  },
})

export const world = 'world'

let message = `${args.positionals[0] || 'hello'} ${world}`

// if --yelling is passed, make the message uppercase
if (args.values.yelling) {
  message = message.toUpperCase()
}

console.log(message)

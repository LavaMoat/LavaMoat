// simple cli tool for managin TODOs
// saves TODOs to file, appending it
// run to display TODOs
// or use "add [text]" to add your todo
// displays data, highlighing high, medium, and low priority tasks

const { createReadStream, promises: fs } = require('fs')
const parseArgs = require('minimist')
const chalk = require('chalk')
const readline = require('readline')

const TODO_FILE = 'todo.txt'

start()

async function start () {
  const argsString = process.argv.slice(2)
  await runCommandFromArgs(argsString)
}

async function runCommandFromArgs (argsString) {
  const args = parseArgs(argsString)
  const action = args._[0] || 'display'
  if (action === 'add') {
    const todoText = args._.slice(1).join(' ')
    const priority = args.priority
    await addTodo(todoText, priority)
  } else if (action === 'display') {
    await displayTodos()
  } else {
    console.log('Usage:\n  display    show existing todos\n  add [text] --priority [Low|Medium|High]  create a new todo, default priority \'Medium\'')
  }
}

async function addTodo (todoText, priority = 'Medium') {
  await fs.appendFile(TODO_FILE, `${priority}: ${todoText} \n`)
  console.log(`Added todo "${todoText}" with priority "${priority}"`)
}

function highlightTodo (todoLine) {
  const [priority, todo] = todoLine.split(': ')
  switch (priority) {
    case 'High': {
      return chalk.red(todo)
    }
    case 'Medium': {
      return chalk.yellow(todo)
    }
    case 'Low': {
      return chalk.green(todo)
    }
    default: {
      throw new Error(`unrecognized priority ${priority}`)
    }
  }
}

function displayTodos () {
  try {
    console.log(chalk.greenBright("****** TODAY'S TODOS ********"))
    const stream = createReadStream(TODO_FILE)
    const lineReader = readline.createInterface({
      input: stream,
    })
    lineReader.on('line', line => {
      console.log(highlightTodo(line))
    })
  } catch (err) {
    if (err.includes('ENOENT')) {
      console.log('Nothing to display. Please add a todo first')
    }
  }
}

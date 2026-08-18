import { who } from 'simple-dep'
import cjsBridge from './requirer.cjs'

interface Message {
    text: string
}

const msg: Message = { text: cjsBridge.greet(who) }

console.log(msg.text)

import React, { Component } from 'react'
import './App.css'
import './graphs/DepGraph.css'

const { DepGraph } = require('./graphs/DepGraph')
const exampleDeps = require('./lavamoat-config-debug.json')
// const bundles = {
//   'background': require('./data/deps.json'),
// }

/* eslint-disable no-restricted-globals */
const bundles = { background: self.DEPS || exampleDeps }

class App extends Component {

  constructor() {
    super()
    this.state = {
      bundle: 'background',
    }
  }
  // selectBundle (target) {
  //   this.setState(state => ({ bundle: target }))
  // }

  render () {
    const bundleData = bundles[this.state.bundle]
    return (
      <div className="App">
        <DepGraph
          bundleData={bundleData}
          /> 
      </div>
    )
  }
}

export default App

import React, { Component } from 'react'
import './css/App.css'
import './css/DepGraph.css'

const { DepGraph } = require('./graphs/DepGraph')
// const bundles = {
//   'background': require('./data/deps.json'),
// }

/* eslint-disable no-restricted-globals */
const bundles = { background: self.CONFIG_DEBUG }

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

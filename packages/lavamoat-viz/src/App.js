import React, { Component } from 'react'
import './css/App.css'
import './css/DepGraph.css'

const { DepGraph } = require('./graphs/DepGraph')
// const bundles = {
//   'background': require('./data/deps.json'),
// }

/* eslint-disable no-restricted-globals */
const configDebug = self.CONFIG_DEBUG
const config = self.CONFIG
const configOverride = self.CONFIG_OVERRIDE
const configFinal = self.CONFIG_FINAL


class App extends Component {
  // selectBundle (target) {
  //   this.setState(state => ({ bundle: target }))
  // }

  render () {
    return (
      <div className="App">
        <DepGraph
          bundleData={configDebug}
          config={config}
          configOverride={configOverride}
          configFinal={configFinal}
          /> 
      </div>
    )
  }
}

export default App

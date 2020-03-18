import React, { Component } from 'react'
import './App.css'
import Nav from './views/nav'

const { DepGraph } = require('./graphs/DepGraph')
const exampleDeps = require('./example-deps.json')
// const bundles = {
//   'background': require('./data/deps.json'),
// }

/* eslint-disable no-restricted-globals */
const bundles = { background: self.DEPS || exampleDeps }

const sesifyModes = ['sesify', 'without']

class App extends Component {

  constructor() {
    super()
    this.state = {
      bundle: 'background',
      sesifyMode: sesifyModes[0],
    }
  }

  selectSesifyMode (target) {
    this.setState(state => ({ sesifyMode: target }))
  }

  // selectBundle (target) {
  //   this.setState(state => ({ bundle: target }))
  // }

  render () {
    const bundleData = bundles[this.state.bundle]
    return (
      <div className="App">
        <Nav
          routes={sesifyModes}
          activeRoute={this.state.sesifyMode}
          onNavigate={(target) => this.selectSesifyMode(target)}
          />
        <DepGraph
          bundleData={bundleData}
          sesifyMode={this.state.sesifyMode}
          /> 
      </div>
    )
  }
}

export default App

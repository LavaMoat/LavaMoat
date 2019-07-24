import React, { Component } from 'react'
import './App.css'
import Nav from './views/nav'
const DepGraph = require('./graphs/DepGraph')
const exampleDeps = require('./example-deps.js')
// const bundles = {
//   'background': require('./data/deps.json'),
// }

/* eslint-disable no-restricted-globals */
const bundles = { background: self.DEPS || exampleDeps }
const bundleNames = Object.keys(bundles)

const routes = ['packages', 'modules']
const sesifyModes = ['sesify', 'without']

class App extends Component {

  constructor() {
    super()
    this.state = {
      mode: routes[0],
      bundle: 'background',
      sesifyMode: sesifyModes[0],
    }
  }

  selectMode (target) {
    this.setState(state => ({ mode: target }))
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
        <Nav
          routes={routes}
          activeRoute={this.state.mode}
          onNavigate={(target) => this.selectMode(target)}
          />
        <DepGraph
          bundleData={bundleData}
          mode={this.state.mode}
          sesifyMode={this.state.sesifyMode}
          /> 
      </div>
    )
  }
}

export default App

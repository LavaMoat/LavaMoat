import React, { Component } from 'react'
import './css/App.css'
import './css/DepGraph.css'
import * as mergePolicy from './merge-deep.js'
import Nav from './views/nav.js'


const { DepGraph } = require('./graphs/DepGraph')

/* eslint-disable no-restricted-globals */
const { LavamoatPolicies } = globalThis

// merge all configs into final
for (const [policyName, policyData] of Object.entries(LavamoatPolicies)) {
  if (!policyData.final) {
    if (policyData.override) {
      policyData.final = mergePolicy(policyData.primary, policyData.override)
    } else {
      policyData.final = policyData.primary
    }
  }
}

const policyNames = Object.keys(LavamoatPolicies)
const defaultPolicyName = policyNames[0]

class App extends Component {

  selectPolicy (target) {
    this.setState(state => ({ policyName: target }))
  }

  render () {
    const state = this.state || {}
    const currentPolicyName = state.policyName || defaultPolicyName
    const currentPolicyData = LavamoatPolicies[currentPolicyName]
    return (
      <div className="App">
        <div className="navWrapper">
          <div className="leftButtonsWrapper">
            <Nav
              routes={policyNames}
              activeRoute={currentPolicyName}
              onNavigate={(target) => this.selectPolicy(target)}
            />
          </div>
        </div>
        <DepGraph
          policyName={currentPolicyName}
          policyData={currentPolicyData}
        />
      </div>
    )
  }
}

export default App

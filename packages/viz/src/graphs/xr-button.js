// import ForceGraph2D from 'react-force-graph-2d'
import React from 'react'
// import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
// import '../css/DepGraph.css'

export default class XrButton extends React.Component {
  constructor () {
    super()
    this.currentSession = null
    this.state = {
      supportsXr: 'xr' in navigator,
      supportsImmersiveVr: undefined,
    }
  }

  async componentDidMount () {
    if (!this.state.supportsXr) {
      return
    }
    const supportsImmersiveVr = await navigator.xr.isSessionSupported('immersive-vr')
    this.setState({ supportsImmersiveVr })
  }

  async toggleSession () {
    const { supportsImmersiveVr } = this.state
    if (!supportsImmersiveVr) {
      return
    }
    if (this.currentSession === null) {
      // WebXR's requestReferenceSpace only works if the corresponding feature
      // was requested at session creation time. For simplicity, just ask for
      // the interesting ones as optional features, but be aware that the
      // requestReferenceSpace call will fail if it turns out to be unavailable.
      // ('local' is always available for immersive sessions and doesn't need to
      // be requested separately.)

      // activate session
      const sessionInit = { optionalFeatures: ['local-floor', 'bounded-floor'] }
      const session = await navigator.xr.requestSession('immersive-vr', sessionInit)
      this.currentSession = session
      // setup start/end handlers
      session.addEventListener('end', () => {
        this.props.onSessionEnded(session)
        this.currentSession = null
      }, { once: true })
      this.props.onSessionStarted(session)
    } else {
      this.currentSession.end()
    }
  }

  render () {
    const {
      supportsXr,
      supportsImmersiveVr,
    } = this.state
    const showButton = supportsXr && supportsImmersiveVr

    return (
      <button
        className='xrButton'
        onClick={() => this.toggleSession()}
        disabled={!showButton}
        style={{
          cursor: 'pointer',
          width: '100px',
        }}
      >
        VR
      </button>
    )
  }
}

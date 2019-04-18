const React = require('react')
const sizeMe = require('react-sizeme')
const SizeContext = React.createContext({ height: 0, width: 0 })

class GraphContainer extends React.Component {
  render () {
    const { size } = this.props
    const children = this.props.children
    console.log('GraphContainer - size:', size)
    return (
      <svg width="100%" height="100%">
        <SizeContext.Provider value={this.props.size}>
          {children}
        </SizeContext.Provider>
      </svg>
    )
  }
}

module.exports = sizeMe({ monitorHeight: true })(GraphContainer)
module.exports.SizeContext = SizeContext
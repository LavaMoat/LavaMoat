const React = require('react')
const sizeMe = require('react-sizeme')

class GraphContainer extends React.Component {
  render () {
    const children = this.props.children
    return (
      // sizeMe doesnt work properly on svg element, so wrap in div
      <div className="fullSize GraphContainer">
        <svg width="100%" height="100%">
          {children}
        </svg>
      </div>
    )
  }
}

// using sizeMe calls props.onSize when size updates
module.exports = sizeMe({ monitorHeight: true })(GraphContainer)
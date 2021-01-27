import '../css/bootstrap.css'
import Tab from 'react-bootstrap/Tab'
import Tabs from 'react-bootstrap/Tabs'

const React = require('react')

class NavTabs extends React.Component {
  render () {
    const { routes } = this.props
    return (
      <Tabs
        id="navigation-tabs"
        activeKey={this.props.activeRoute}
        onSelect={this.props.onNavigate}
      >
        {routes.map((route) => (
          <Tab key={route} eventKey={route} title={route} />
        ))}
      </Tabs>
    )
  }
}

export default NavTabs

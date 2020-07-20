/* eslint-disable import/no-unassigned-import */
import React from 'react'
import {
  getColorForRank,
} from '../graphs/utils/utils.js'
import '../css/DepGraph.css'

class DepList extends React.Component {
  constructor () {
    super()
    this.state = {
      // codeMirror: null,
    }
  }

  render () {
    const {
      sortedPackages,
    } = this.props

    return (
      <div>
        <div className="packagesStyle">
          <div style={{ marginBottom: '10px' }}>Packages containing globals</div>
          <div>
            {sortedPackages.map((packageData, index) => this.renderPackage(packageData, index))}
          </div>
        </div>
      </div>
    )
  }

  renderPackage (packageData, index) {
    const { actions, selectedPackage, selectedModule } = this.props
    const isExpanded = selectedPackage && packageData.id === selectedPackage.id
    const isSelected = isExpanded && !selectedModule
    return (
      <div
        key={index}
        className="listStyle"
      >
        <div
          className="packageWrapper"
          // onMouseEnter={() => {
          //   if (packageModulesMode) return
          //   actions.selectNode(packageData)
          // }}
          style={{
            background: isSelected ? '#FFFF00' : undefined,
          }}
          onClick={() => {
            // if (viewSource) actions.toggleSource()
            actions.selectPackage(packageData.id)
          }}
        >
          <div className={`packageIcon ${getColorForRank(packageData.dangerRank)}`}/>
          {packageData.id}
        </div>
        {isExpanded && this.renderPackageModuleList(packageData)}
      </div>
    )
  }

  renderPackageModuleList (packageData) {
    const { sortedModules } = this.props
    if (packageData.type === 'builtin') {
      return null
    }
    if (packageData.isRoot) {
      return null
    }
    return (
      <div className="moduleList">
        {sortedModules.map((module, index) => this.renderPackageModule(module, index))}
      </div>
    )
  }

  renderPackageModule (module, index) {
    const { actions, selectedModule } = this.props
    const isSelected = selectedModule && selectedModule.id === module.id
    return (
      <div
        key={index}
        className={'listStyle'}
      >
        <div
          className="moduleWrapper"
          id={`${index}`}
          style={{
            background: isSelected ? '#FFFF00' : undefined,
          }}
          onClick={() => {
            actions.selectModule(module.id)
          }}>
          <div className={`moduleIcon ${module.color}`} />
          {module.fileSimple}
        </div>
      </div>
    )
  }
}

export { DepList }

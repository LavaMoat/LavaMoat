/* eslint-disable import/no-unassigned-import */
import { UnControlled as CodeMirror } from 'react-codemirror2'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/material.css'
import React from 'react'
import {
  fullModuleNameFromPath,
  getLineNumbersForGlobals,
  getColorForRank,
} from '../graphs/utils/utils.js'
import '../css/DepGraph.css'

require('codemirror/mode/javascript/javascript')

class DepList extends React.Component {
  constructor () {
    super()
    this.state = {
      codeMirror: null,
    }
  }

  render () {
    const {
      // actions,
      sortedPackages,
      // sortedModules,
      packageModulesMode,
      // packageModules,
      // moduleData,
      selectedNodeLabel,
      selectedNodeData,
      // selectedModule,
      // selectedNode,
      viewSource,
      // selectionLocked,
    } = this.props
    const { codeMirror } = this.state
    let source
    if (codeMirror && viewSource) {
      // uncomment for module nodes
      // source = packageModules[selectedNode.id].source
      // globals = packageModules[selectedNode.id].globalUsage || null
      codeMirror.refresh()
      // source = sortedModules[selectedModule].source
      // const globals = sortedModules[selectedModule].globalUsage || null
      source = 'add later'
      const globals = null
      const lineNumbersForGlobals = getLineNumbersForGlobals(source, globals)
      let selectedLineIndex = 0
      let line
      let lineClassActive = false
      codeMirror.focus()
      codeMirror.setOption('extraKeys', {
        Enter (cm) {
          if (lineNumbersForGlobals.length === 0) {
            return
          }
          const doc = cm.getDoc()
          if (lineClassActive) {
            doc.removeLineClass(line, 'text', 'highlight')
          }
          line = lineNumbersForGlobals[selectedLineIndex]
          const position = codeMirror.charCoords({ line, ch: 0 }, 'local').top
          codeMirror.scrollTo(null, position)
          doc.addLineClass(line, 'text', 'highlight')
          lineClassActive = true
          if (lineNumbersForGlobals.length - 1 === selectedLineIndex) {
            selectedLineIndex = 0
          } else {
            selectedLineIndex += 1
          }
        },
      })
    }

    let displayedData
    if (selectedNodeLabel === 'External Dependency' || !packageModulesMode) {
      displayedData = `${selectedNodeLabel}\n${selectedNodeData}`
    } else {
      displayedData = `${fullModuleNameFromPath(selectedNodeLabel) || selectedNodeLabel}\n${selectedNodeData}`
    }

    const dataComponent = viewSource ?
      <CodeMirror
        value={source}
        options={{
          mode: 'javascript',
          readOnly: true,
        }}
        editorDidMount={(editor) => {
          this.setState({ codeMirror: editor })
        }}
      />
      :
      <pre className="packageInfoStyle">
        {displayedData}
      </pre>

    return (
      <div>
        <div className="packagesStyle">
          <div style={{ marginBottom: '10px' }}>Packages containing globals</div>
          <div>
            {sortedPackages.map((packageData, index) => this.renderPackage(packageData, index))}
          </div>
        </div>
        {dataComponent}
      </div>
    )
  }

  renderPackage (packageData, index) {
    const { actions } = this.props
    // packageModulesMode && getPackageVersionName(Object.values(packageModules)[0]) === packageData.label ? */
    const packageIsExpanded = packageData.id === this.props.selectedPackage
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
          onClick={() => {
            // if (viewSource) actions.toggleSource()
            actions.selectPackage(packageData.id)
          }}
        >
          <div className={`packageIcon ${getColorForRank(packageData.dangerRank)}`}/>
          {packageData.name}
        </div>
        {packageIsExpanded && this.renderPackageModuleList()}
      </div>
    )
  }

  renderPackageModuleList () {
    const { sortedModules } = this.props
    return (
      <div className="moduleList">
        {sortedModules.map((module, index) => this.renderPackageModule(module, index))}
      </div>
    )
  }

  renderPackageModule (module, index) {
    const { actions, sortedModules, selectedModule } = this.props
    const isLastItem = index === sortedModules.length - 1
    const isSelected = selectedModule === module.id
    return (
      <div
        key={index}
        className={isLastItem ? null : 'listStyle'}
      >
        <div
          className="moduleWrapper"
          id={`${index}`}
          style={{
            background: isSelected ? undefined : '#FFFF00',
          }}
          onClick={() => {
            actions.selectModule(module)
          }}>
          <div className={`moduleIcon ${module.color}`} />
          {fullModuleNameFromPath(module.file)}
        </div>
      </div>
    )
  }
}

export { DepList }

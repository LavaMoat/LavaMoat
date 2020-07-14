import { UnControlled as CodeMirror } from 'react-codemirror2'
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import {
  getPackageVersionName,
  fullModuleNameFromPath,
  getLineNumbersForGlobals
} from '../graphs/utils/utils.js'
import React from 'react'
import '../css/DepGraph.css'

require('codemirror/mode/javascript/javascript');

class DepList extends React.Component {
  constructor() {
      super()
      this.state = {
        codeMirror: null
      }
  }

  render () {
    const {
      actions,
      sortedPackages,
      sortedModules,
      packageModulesMode,
      packageModules,
      moduleData,
      selectedNodeLabel,
      selectedNodeData,
      selectedModule,
      selectedNode,
      viewSource,
      selectionLocked
    } = this.props
    const { codeMirror } = this.state
    let source
    if (codeMirror && viewSource) {
      // uncomment for module nodes
      // source = packageModules[selectedNode.id].source
      // globals = packageModules[selectedNode.id].globalUsage || null
      codeMirror.refresh()
      source = sortedModules[selectedModule].source
      const globals = sortedModules[selectedModule].globalUsage || null
      const lineNumbersForGlobals = getLineNumbersForGlobals(source, globals)
      let selectedLineIndex = 0
      let line
      let lineClassActive = false
      codeMirror.focus()
      codeMirror.setOption("extraKeys", {
        Enter: function (cm) {
          if (lineNumbersForGlobals.length === 0) return
          const doc = cm.getDoc()
          if (lineClassActive) doc.removeLineClass(line, 'text', 'highlight')
          line = lineNumbersForGlobals[selectedLineIndex]
          const position = codeMirror.charCoords({ line: line, ch: 0 }, "local").top;
          codeMirror.scrollTo(null, position);
          doc.addLineClass(line, 'text', 'highlight')
          lineClassActive = true
          if (lineNumbersForGlobals.length - 1 === selectedLineIndex) {
            selectedLineIndex = 0
          } else {
            selectedLineIndex += 1
          }
        }
      });
      
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
        readOnly: true
      }}
      editorDidMount={editor => {
        this.setState({ codeMirror: editor })
      }}
    />
    :
    <pre className='packageInfoStyle'>
        {displayedData}
    </pre>

    return(
      <div>
        <div className='packagesStyle'>
          <div style={{marginBottom: '10px'}}>Packages containing globals</div>
          <div>
            {sortedPackages.map((node, index) =>
              <div
                key={index}
                className='listStyle'
              >
                <div 
                  className='packageWrapper'
                  onMouseEnter={() => {
                    if (packageModulesMode) return
                    actions.selectNode(node)
                  }}
                  onClick={() => {
                    if (viewSource) actions.toggleSource()
                    actions.togglePackageModules(node)
                  }}
                >
                  <div className={`packageIcon ${node.color}`}/>
                  {node.label}
                </div>
                {packageModulesMode && getPackageVersionName(Object.values(packageModules)[0]) === node.label ?
                  <div className='moduleList'>
                    {sortedModules.map((module, index, array) =>
                      <div
                        key={index}
                        className={index === array.length - 1 ? null : 'listStyle'}>
                        <div
                          className='moduleWrapper'
                          id={`${index}`}
                          onClick={(e) => {
                            const element = e.target
                            const attribute = ["style", "background: #FFFF00;"]
                            if (!selectedModule && selectedModule !== 0) {
                              actions.selectModule(index)
                              element.setAttribute(...attribute)
                            } else {
                              if (e.target.id == selectedModule) {
                                element.removeAttribute(...attribute)
                                actions.selectModule(null)
                              } else {
                                element.setAttribute(...attribute)
                                document.getElementById(selectedModule).removeAttribute(...attribute)
                                actions.selectModule(index)
                              }
                            }
                          }}>
                          <div className={`moduleIcon ${module.color}`} />
                          {fullModuleNameFromPath(module.file)}
                        </div>
                      </div>
                    )}
                  </div> :
                  <div />
                }
              </div>)}
          </div>
        </div>
        {dataComponent}
      </div>
    )
  }
}

export { DepList }
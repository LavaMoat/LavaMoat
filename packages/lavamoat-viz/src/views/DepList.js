import {
  getPackageVersionName,
  fullModuleNameFromPath,
  getLineNumbersForGlobals
} from '../graphs/utils/utils'
import React from 'react'
import '../graphs/DepGraph.css'
import { UnControlled as CodeMirror } from 'react-codemirror2'

class DepList extends React.Component {
  constructor() {
      super()
  }

  render () {
    const {
      actions,
      globalUsagePackages,
      packageModulesMode,
      packageModules,
      moduleData,
      selectedNodeLabel,
      selectedNodeData,
      selectedNode,
      viewSource,
    } = this.props
    
    let displayedData
    let source
    let globals

    if (viewSource) {
      source = packageModules[selectedNode.id].source
      globals = packageModules[selectedNode.id].globalUsage || null
    }
    if (selectedNodeLabel === 'External Dependency' || !packageModulesMode) {
      displayedData = `${selectedNodeLabel}\n${selectedNodeData}`
    } else {
      displayedData = `${fullModuleNameFromPath(selectedNodeLabel) || selectedNodeLabel}\n${selectedNodeData}`
    }

    const dataComponent = viewSource ?
    <div className='codeWrapper'>
      <CodeMirror
        value={source}
        options={{mode: 'javascript', autofocus: true}}
        editorDidMount={editor => {
          const lineNumbersForGlobals = getLineNumbersForGlobals(source, globals)
          let selectedLineIndex = 0
          let line
          let lineClassActive = false
          editor.focus()
          editor.setOption("extraKeys", {
            Enter: function (cm) {
              const doc = cm.getDoc()
              if (lineClassActive) doc.removeLineClass(line, 'text', 'highlight')
              line = lineNumbersForGlobals[selectedLineIndex]
              const position = editor.charCoords({ line: line, ch: 0 }, "local").top;
              editor.scrollTo(null, position);
              doc.addLineClass(line, 'text', 'highlight')
              lineClassActive = true

              if (lineNumbersForGlobals.length - 1 === selectedLineIndex) {
                selectedLineIndex = 0
              } else {
                selectedLineIndex += 1
              }
            }
          });
        }}
      />
    </div>
    :
    <pre className='packageInfoStyle'>
        {displayedData}
    </pre>

    return(
      <div>
        <pre className='packagesStyle'>
          {"Packages containing globals\n\n"}
          <ol>
            {globalUsagePackages.map(node =>
              <li
                key={globalUsagePackages.indexOf(node)}>
                <div
                  className='package'
                  onMouseEnter={() => {
                    if (packageModulesMode) return
                    actions.selectNode(node)
                  }}
                  onClick={() => {
                    if (viewSource) actions.toggleSource()
                    actions.togglePackageModules(node)
                  }}>
                  {node.label}
                </div>
                {packageModulesMode && getPackageVersionName(Object.values(packageModules)[0]) === node.label ?
                  <ol>
                    {Object.entries(packageModules).map(([id, value], index) =>
                      <li
                        key={id}>
                        <div
                          className='package'
                          onMouseEnter={() => {
                            actions.selectNode(moduleData.nodes[index])
                          }}>
                          
                          {fullModuleNameFromPath(value.file)}
                        </div>
                      </li>
                    )}
                  </ol> :
                  <ol />
                }
              </li>)}
          </ol>
        </pre>
        {dataComponent}
      </div>
    )
  }
}

export { DepList }
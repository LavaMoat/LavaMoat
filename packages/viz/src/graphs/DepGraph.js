/* eslint-disable react/no-deprecated */
import ForceGraph2D from 'react-force-graph-2d'
import ThreeForceGraph from 'three-forcegraph'
// import SpriteText from 'three-spritetext';
// import * as THREE from 'three';
import React from 'react'
import '../css/DepGraph.css'
import { UnControlled as CodeMirror } from 'react-codemirror2'
import Nav from '../views/nav.js'
import { DepList } from '../views/DepList.js'
import {
  parseConfigDebugForPackages,
  createGraph,
  getPackageVersionName,
  getDangerRankForModule,
  sortByDangerRank,
  getColorForRank,
  getLineNumbersForGlobals
  , envConfig,
} from './utils/utils.js'
import XrButton from './xr-button.js'
import setupScene from './vr-viz/setupScene.js'
// import setupSelections from './vr-viz/setupSelections.js'
import setupGraph from './vr-viz/setupGraph.js'

import 'codemirror/theme/material.css'

// const d3 = require('d3')

const lavamoatModes = ['lavamoat', 'without']

class DepGraph extends React.Component {
  constructor () {
    super()
    // prepare empty graph
    const graph = { nodes: [], links: [], container: { width: 0, height: 0 } }

    this.state = {
      packages: {},
      packageData: graph,
      moduleRecord: null,
      packageModulesMode: false,
      packageModules: {},
      selectedModule: null,
      viewSource: false,
      lavamoatMode: lavamoatModes[0],
      showPackageSize: false,
      selectionLocked: false,
    }
  }

  componentDidMount () {
    const { forceGraph } = this
    this.triggerGraphUpdate()

    window.xyz = forceGraph

    // forceGraph.d3Force('charge').strength(-50)
    // forceGraph.d3Force('x', d3.forceX(0, 1))
    // forceGraph.d3Force('y', d3.forceY(0, 1))
  }

  componentWillReceiveProps (nextProps) {
    // recalculate graph if `policyData` changes
    if (this.props.policyData !== nextProps.policyData) {
      this.triggerGraphUpdate(this.state, nextProps)
    }
  }

  setStateAndUpdateGraph (newState) {
    this.setState(newState)
    this.triggerGraphUpdate(Object.assign(this.state, newState))
  }

  triggerGraphUpdate (state = this.state, newProps = this.props) {
    const { policyData } = newProps
    this.updateGraph(policyData, state)
  }

  updateGraph (policyData, state) {
    const {
      packageData,
      // packageModules,
      // packageModulesMode,
    } = state

    // const newGraph = createPackageGraph(bundleData, state)
    const packages = parseConfigDebugForPackages(policyData.debug, policyData.final)
    const newGraph = createGraph(packages, policyData.final, state)

    // create a map for faster lookups by id
    const nodeLookup = new Map(newGraph.nodes.map((node) => [node.id, node]))
    // copy simulation data from old graph

    const oldGraph = packageData
    oldGraph.nodes.forEach((oldNode) => {
      const newNode = nodeLookup.get(oldNode.id)
      if (!newNode) {
        return
      }
      const { x, y, vx, vy } = oldNode
      Object.assign(newNode, { x, y, vx, vy })
    })
    // commit new graph
    // Uncomment for module nodes
    // if (packageModulesMode) {
    //   this.setState(() => ({ moduleRecord: newGraph }))
    // } else {
    //   this.setState(() => ({ packageData: newGraph }))
    // }
    this.setState(() => ({ packages, packageData: newGraph }))
  }

  getModulesForPackage (packageId) {
    const { policyData } = this.props
    const { debugInfo } = policyData.debug
    const packageModules = {}
    const moduleSources = []
    Object.entries(debugInfo).forEach(([moduleSpecifier, moduleDebugInfo]) => {
      const { moduleRecord } = moduleDebugInfo
      const rank = getDangerRankForModule(moduleDebugInfo, envConfig)
      const color = getColorForRank(rank)
      if (getPackageVersionName(moduleRecord) === packageId) {
        if (!moduleSources.includes(moduleRecord.content)) {
          moduleSources.push(moduleRecord.content)
          packageModules[moduleSpecifier] = moduleRecord
          packageModules[moduleSpecifier].color = color
          packageModules[moduleSpecifier].dangerRank = rank
        }
      }
    })
    return packageModules
  }

  onVrSessionStart (session) {
    const { packageData } = this.state
    const { scene, renderer, subscribeTick } = setupScene()
    const graph = new ThreeForceGraph()
      .graphData(packageData)
      // .nodeThreeObject((node) => {
      //   return new SpriteText(node.label || node.id || 'hello', 10, node.color);
      // })
    setupGraph({ scene, graph, subscribeTick })
    renderer.xr.setSession(session)
  }

  onVrSessionEnd () {
    console.log('vr session end')
  }

  render () {
    const { policyData } = this.props
    const {
      packages,
      packageData,
      // moduleRecord,
      // selectedNode,
      packageModulesMode,
      packageModules,
      viewSource,
      lavamoatMode,
      showPackageSize,
      selectedPackage,
      selectedModule,
      selectionLocked,
    } = this.state

    const actions = {
      selectNode: (node) => {
        const newState = { selectedNode: node }
        this.setStateAndUpdateGraph(newState)
      },
      selectModule: (moduleSpecifier) => {
        let newSelection
        if (selectedModule && selectedModule === moduleSpecifier) {
          newSelection = null
        } else {
          newSelection = policyData.debug.debugInfo[moduleSpecifier].moduleRecord
        }
        this.setState({
          selectedModule: newSelection,
        })
      },
      selectPackage: (packageId) => {
        if (selectedPackage && packageId === selectedPackage.id) {
          this.setState({
            selectedPackage: null,
            selectedModule: null,

            packageModulesMode: false,
          })
        } else {
          const newSelection = packages[packageId]
          const modules = this.getModulesForPackage(packageId)
          const newState = {
            selectedPackage: newSelection,
            selectedModule: null,
            packageModulesMode: true,
            packageModules: modules,
          }
          this.setStateAndUpdateGraph(newState)
        }
      },
      toggleSource: () => {
        this.setState({ viewSource: !viewSource })
      },
      togglePackageSize: () => {
        const newState = { showPackageSize: !showPackageSize }
        this.setStateAndUpdateGraph(newState)
      },
      toggleLockSelection: () => {
        this.setState({ selectionLocked: !selectionLocked })
      },
      selectlavamoatMode: (target) => {
        const newState = { lavamoatMode: target }
        this.setStateAndUpdateGraph(newState)
      },
    }
    const graphData = packageData
    let sortedPackages = []
    let sortedModules = []
    // let selectedNodeLabel
    // let selectedNodeData
    let sourceButtonStyle
    let helpMessage

    // if (selectedPackage) {
    //   selectedNodeLabel = selectedPackage.id
    //   selectedNodeData = 'funky town'
    //   // if (packageModulesMode && !isNaN(selectedNode.id) && selectedNode.id in packageModules) {

    //   //   selectedNodeData = JSON.stringify(packageModules[selectedNode.id].globalUsage, null, 2) || null
    //   // } else {
    //   //   selectedNodeData = selectedNode.configLabel
    //   // }
    // } else {
    //   selectedNodeLabel = 'select a node'
    //   selectedNodeData = ''
    // }
    if (!packageModulesMode || !selectedModule) {
      sourceButtonStyle = { display: 'none' }
    }
    if (viewSource) {
      helpMessage = 'Press ENTER to navigate between globals'
    }

    sortedPackages = sortByDangerRank(packages)
    if (packageModules) {
      const packageModulesList = Object.values(packageModules)
      sortedModules = sortByDangerRank(packageModulesList)
    }

    return (
      <div>
        <div className="navWrapper">
          <div className="leftButtonsWrapper">
            <Nav
              routes={lavamoatModes}
              activeRoute={lavamoatMode}
              onNavigate={(target) => actions.selectlavamoatMode(target)}
            />
            {/* <div className="sizeModeWrapper">
              <button
                className="sizeModeButton"
                onClick={() => {
                  actions.togglePackageSize()
                }}
              >
              View Package Size
              </button>
            </div> */}
            <XrButton
              onSessionStarted={(session) => this.onVrSessionStart(session)}
              onSessionEnded={(session) => this.onVrSessionEnd(session)}
            />
          </div>

          <div className="viewSourceWrapper">
            <div className="helpMessage">
              {helpMessage}
            </div>
            <button
              className="sourceButton"
              style={sourceButtonStyle}
              onClick={() => actions.toggleSource()}
            >
              View Source
            </button>
          </div>
        </div>
        <DepList
          actions={actions}
          packages={packages}
          sortedPackages={sortedPackages}
          sortedModules={sortedModules}
          selectedPackage={selectedPackage}
          selectedModule={selectedModule}
        />
        {this.renderSelectedNodeView()}
        <ForceGraph2D
          ref={(el) => {
            this.forceGraph = el
          }}
          graphData={graphData}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          nodeLabel="label"
          // onNodeHover={(node) => {
          //   if (!node) return
          //   if (packageModulesMode && !packageModules[node.id]) return
          //   actions.selectNode(node)
          // }}
          onNodeClick={({ id }) => actions.selectPackage(id)}
          linkWidth={(link) => link.width}
          linkColor={(link) => link.color}
        />
      </div>
    )
  }

  renderSelectedNodeView () {
    const { selectedPackage, selectedModule } = this.state
    if (selectedModule) {
      return this.renderSelectedModule(selectedModule)
    } else if (selectedPackage) {
      return this.renderSelectedPackage(selectedPackage)
    }
    return (
      <pre className="packageInfo">
        please select a package
      </pre>
    )
  }

  renderSelectedPackage (selectedPackage) {
    const { policyData: { final: { resources: finalPolicyResources } } } = this.props
    const packagePolicy = finalPolicyResources[selectedPackage.name] || {}
    return (
      <div className="packageInfo">
        <pre>{selectedPackage.id}</pre>
        policy for this package:
        <pre>
          {JSON.stringify(packagePolicy, null, 2)}
        </pre>
      </div>
    )
  }

  renderSelectedModule (selectedModule) {
    const { policyData: { debug: { debugInfo } } } = this.props
    const moduleDebugInfo = debugInfo[selectedModule.specifier]
    const moduleDisplayInfo = { ...moduleDebugInfo, moduleRecord: undefined }
    const { packageData } = moduleDebugInfo.moduleRecord
    const component = this.state.viewSource ? this.renderSelectedNodeCode(selectedModule) : (
      <div className="packageInfo">
        <pre>{packageData.id}</pre>
        <pre>{selectedModule.fileSimple}</pre>
        policies generated from this file:
        <pre>
          {JSON.stringify(moduleDisplayInfo, null, 2)}
        </pre>
      </div>
    )
    return component
  }

  renderSelectedNodeCode (selectedModule) {
    // eslint-disable-next-line global-require
    require('codemirror/mode/javascript/javascript')
    const { policyData } = this.props
    const { debug: { debugInfo } } = policyData
    const { codeMirror } = this.state
    let source
    if (codeMirror) {
      // uncomment for module nodes
      // source = packageModules[selectedNode.id].source
      // globals = packageModules[selectedNode.id].globalUsage || null
      codeMirror.refresh()
      source = selectedModule.content
      const globals = debugInfo[selectedModule.specifier].globals || null
      const lineNumbersForGlobals = globals === null ? [] : getLineNumbersForGlobals(source, globals)
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
    return (
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
    )
  }
}

export { DepGraph }

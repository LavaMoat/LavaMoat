/* eslint-disable react/no-deprecated */
import ForceGraph2D from 'react-force-graph-2d'
import ThreeForceGraph from 'three-forcegraph'
// import SpriteText from 'three-spritetext';
// import * as THREE from 'three';
import React from 'react'
import '../css/DepGraph.css'
import Nav from '../views/nav.js'
import { DepList } from '../views/DepList.js'
import {
  parseConfigDebugForPackages,
  createGraph,
  getPackageVersionName,
  getDangerRankForModule,
  sortByDangerRank,
  getColorForRank,
} from './utils/utils.js'
import XrButton from './xr-button.js'
import setupScene from './vr-viz/setupScene.js'
// import setupSelections from './vr-viz/setupSelections.js'
import setupGraph from './vr-viz/setupGraph.js'

const d3 = require('d3')


const lavamoatModes = ['lavamoat', 'without']

class DepGraph extends React.Component {
  constructor () {
    super()
    // prepare empty graph
    const graph = { nodes: [], links: [], container: { width: 0, height: 0 } }

    this.state = {
      packages: {},
      packageData: graph,
      moduleData: null,
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

    forceGraph.d3Force('charge').strength(-50)
    forceGraph.d3Force('x', d3.forceX(0, 1))
    forceGraph.d3Force('y', d3.forceY(0, 1))
  }

  componentWillReceiveProps (nextProps) {
    // recalculate graph if `bundleData` changes
    if (this.props.bundleData !== nextProps.bundleData) {
      this.triggerGraphUpdate(this.state, nextProps)
    }
  }

  setStateAndUpdateGraph (newState) {
    this.setState(newState)
    this.triggerGraphUpdate(Object.assign(this.state, newState))
  }

  triggerGraphUpdate (state = this.state, newProps = this.props) {
    const { bundleData } = newProps
    this.updateGraph(bundleData, state)
  }

  updateGraph (bundleData, state) {
    const {
      packageData,
      // packageModules,
      // packageModulesMode,
    } = state

    // Uncomment for module nodes
    // let newGraph
    // if (packageModulesMode) {
    //   newGraph = createModuleGraph(packageModules, state)
    // } else {
    //   newGraph = createPackageGraph(bundleData, state)
    // }

    // const newGraph = createPackageGraph(bundleData, state)
    const packages = parseConfigDebugForPackages(bundleData)
    const newGraph = createGraph(packages, bundleData, state)

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
    //   this.setState(() => ({ moduleData: newGraph }))
    // } else {
    //   this.setState(() => ({ packageData: newGraph }))
    // }
    this.setState(() => ({ packages, packageData: newGraph }))
  }

  getModulesForPackage (packageId) {
    const { bundleData } = this.props
    const { debugInfo } = bundleData
    const packageModules = {}
    const moduleSources = []
    Object.entries(debugInfo).forEach(([moduleId, moduleDebugInfo]) => {
      const { moduleData } = moduleDebugInfo
      const rank = getDangerRankForModule(moduleDebugInfo)
      const color = getColorForRank(rank)
      if (getPackageVersionName(moduleData) === packageId) {
        if (!moduleSources.includes(moduleData.source)) {
          moduleSources.push(moduleData.source)
          packageModules[moduleId] = moduleData
          packageModules[moduleId].color = color
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
    const {
      packages,
      packageData,
      moduleData,
      selectedNode,
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
      selectModule: (moduleId) => {
        let newSelection
        if (selectedModule === moduleId) {
          newSelection = null
        } else {
          newSelection = moduleId
        }
        this.setState({ selectedModule: newSelection })
      },
      selectPackage: (packageId) => {
        if (packageId === selectedPackage) {
          this.setState({
            selectedPackage: null,
            selectedModule: null,

            packageModulesMode: false,
          })
        } else {
          const modules = this.getModulesForPackage(packageId)
          const newState = {
            selectedPackage: packageId,

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
    let selectedNodeLabel
    let selectedNodeData
    // let sourceButtonStyle
    // let helpMessage

    if (selectedNode) {
      selectedNodeLabel = selectedNode.label
      if (packageModulesMode && !isNaN(selectedNode.id) && selectedNode.id in packageModules) {

        selectedNodeData = JSON.stringify(packageModules[selectedNode.id].globalUsage, null, 2) || null
      } else {
        selectedNodeData = selectedNode.configLabel
      }
    } else {
      selectedNodeLabel = 'select a node'
      selectedNodeData = ''
    }
    // if (!packageModulesMode) {
    //   sourceButtonStyle = { display: 'none' }
    // }
    // if (viewSource) {
    //   helpMessage = 'Press ENTER to navigate between globals'
    // }

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
            <div className="sizeModeWrapper">
              <button
                className="sizeModeButton"
                onClick={() => {
                  actions.togglePackageSize()
                }}
              >
              View Package Size
              </button>
            </div>
            <XrButton
              onSessionStarted={(session) => this.onVrSessionStart(session)}
              onSessionEnded={(session) => this.onVrSessionEnd(session)}
            />
          </div>

          {/* <div className="viewSourceWrapper">
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
        </div> */}
        </div>
        <DepList
          actions={actions}
          selectedPackage={selectedPackage}

          sortedPackages={sortedPackages}
          sortedModules={sortedModules}
          packageModulesMode={packageModulesMode}
          selectedNode={selectedNode}
          packageModules={packageModules}
          selectedNodeLabel={selectedNodeLabel}
          selectedNodeData={selectedNodeData}
          selectedModule={selectedModule}
          moduleData={moduleData}
          viewSource={viewSource}
          selectionLocked={selectionLocked}
        />
        <ForceGraph2D
          ref={(el) => {
            this.forceGraph = el
          }}
          graphData={graphData}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          nodeLabel={'label'}
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
}

export { DepGraph }

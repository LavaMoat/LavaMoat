// fix for silencing aframe errors
import '../css/DepGraph.css'
import {
  createPackageGraph,
  createModuleGraph,
  getPackageVersionName,
  getColorForModule,
  sortByColor
} from './utils/utils'
import Nav from '../views/nav'
import { DepList } from '../views/DepList'
import { ForceGraph2D } from 'react-force-graph'
import React from 'react'
const d3 = require('d3')

const lavamoatModes = ['lavamoat', 'without']

class DepGraph extends React.Component {
  constructor () {
    super()
    // prepare empty graph
    const graph = { nodes: [], links: [], container: { width: 0, height: 0 } }

    this.state = {
      packageData: graph,
      moduleData: null,
      packageModulesMode: false,
      packageModules: {},
      selectedModule: null,
      viewSource: false,
      lavamoatMode: lavamoatModes[0],
      showPackageSize: false,
      selectionLocked: false
    };
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
      packageModules,
      packageModulesMode
    } = state

    // Uncomment for module nodes
    // let newGraph
    // if (packageModulesMode) {
    //   newGraph = createModuleGraph(packageModules, state)
    // } else {
    //   newGraph = createPackageGraph(bundleData, state)
    // }

    const newGraph = createPackageGraph(bundleData, state)
    // create a map for faster lookups by id
    const nodeLookup = new Map(newGraph.nodes.map(node => [node.id, node]))
    // copy simulation data from old graph

    const oldGraph = packageData
    oldGraph.nodes.forEach((oldNode) => {
      const newNode = nodeLookup.get(oldNode.id)
      if (!newNode) return
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
    this.setState(() => ({ packageData: newGraph }))
  }

  getModulesForPackage (node) {
    const { bundleData } = this.props
    const { label } = node
    let packageModules = {}
    let moduleSources = []
    Object.entries(bundleData).forEach(([moduleId, moduleData]) => {
      const color = getColorForModule(moduleData)
      if (getPackageVersionName(moduleData) === label) {
        if (!moduleSources.includes(moduleData.source)) {
          moduleSources.push(moduleData.source)
          packageModules[moduleId] = moduleData
          packageModules[moduleId].color = color
        }
      }
    })
    return packageModules
  }

  render () {
    const { 
      packageData,
      moduleData,
      selectedNode,
      packageModulesMode,
      packageModules,
      viewSource,
      lavamoatMode,
      showPackageSize,
      selectedModule,
      selectionLocked
    } = this.state

    const actions = {
      selectNode: (node) => {
        const newState = { selectedNode: node }
        this.setStateAndUpdateGraph(newState)
      },
      selectModule: (name) => {
        this.setState({ selectedModule: name })
      },
      togglePackageModules: (node) => {
        if (packageModulesMode) {
          this.setState({
            packageModulesMode: false,
            selectedModule: null
          })
          return
        }
        const modules = this.getModulesForPackage(node)
        const newState = {
          packageModulesMode: true,
          packageModules: modules
        }
        this.setStateAndUpdateGraph(newState)
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
      }
    }
    const graphData = packageData
    let sortedPackages = []
    let sortedModules = []
    let selectedNodeLabel
    let selectedNodeData
    let sourceButtonStyle
    let helpMessage

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
    if (!packageModulesMode ||
      !selectedNode.label === 'External Dependency' ||
      (!selectedModule && selectedModule !== 0)) {
      sourceButtonStyle = { display: 'none' }
    }
    if (viewSource) {
      helpMessage = "Press ENTER to navigate between globals"
    }
    
    sortedPackages = sortByColor(packageData.nodes)
    if (packageModules) {
      const packageModulesList = Object.values(packageModules)
      sortedModules = sortByColor(packageModulesList)
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
              onClick={() => {actions.togglePackageSize()}}
            >
              View Package Size
            </button>
          </div>
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
        ref={el => this.forceGraph = el}
        graphData={graphData}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        nodeLabel={'label'}
        onNodeHover={(node) => {
          if (!node) return
          if (packageModulesMode && !packageModules[node.id]) return
          actions.selectNode(node)
        }}
        onNodeClick={(node) => actions.togglePackageModules(node)}
        linkWidth={(link) => link.width}
        linkColor={(link) => link.color}
      />
    </div>
    )
  }
}

export { DepGraph }
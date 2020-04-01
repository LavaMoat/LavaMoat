// fix for silencing aframe errors
import './DepGraph.css'
import {
  createPackageGraph,
  createModuleGraph,
  getPackageVersionName,
} from './utils/utils'
import Nav from '../views/nav'
import { DepList } from '../views/DepList'
import { ForceGraph2D } from 'react-force-graph'
import React from 'react'
const d3 = require('d3')

const sesifyModes = ['sesify', 'without']

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
      viewSource: false,
      sesifyMode: sesifyModes[0]
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

    let newGraph
    if (packageModulesMode) {
      newGraph = createModuleGraph(packageModules, state)
    } else {
      newGraph = createPackageGraph(bundleData, state)
    }
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
    if (packageModulesMode) {
      this.setState(() => ({ moduleData: newGraph }))
    } else {
      this.setState(() => ({ packageData: newGraph }))
    }
  }

  getModulesForPackage (node) {
    const { bundleData } = this.props
    const { label } = node
    let packageModules = {}

    Object.entries(bundleData).forEach(([moduleId, moduleData]) => {
      if (getPackageVersionName(moduleData) === label) {
        packageModules[moduleId] = moduleData
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
      sesifyMode
    } = this.state

    const actions = {
      selectNode: (node) => {
        const newState = { selectedNode: node }
        this.setState(newState)
        this.triggerGraphUpdate(Object.assign(this.state, newState))
      },
      togglePackageModules: (node) => {
        if (packageModulesMode) {
          this.setState({packageModulesMode: false})
          return
        }
        const modules = this.getModulesForPackage(node)
        const newState = {
          packageModulesMode: true,
          packageModules: modules
        }
        this.setState(newState)
        this.triggerGraphUpdate(Object.assign(this.state, newState))
      },
      toggleSource: () => {
        this.setState({viewSource: !viewSource})
      },
      selectSesifyMode: (target) => {
        this.setState({ sesifyMode: target })
      }
    }
    const graphData = packageData
    let selectedNodeLabel
    let selectedNodeData
    let globalUsagePackages = []
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
      isNaN(selectedNode.id)) {
      sourceButtonStyle = { pointerEvents: 'none', color: 'gray' }
    }
    if (viewSource) {
      helpMessage = "Press ENTER to navigate between globals"
    }
    globalUsagePackages = packageData.nodes.filter(node => JSON.parse(node.configLabel).hasOwnProperty('globals'))

    return (
    <div>
      <div className="navWrapper">
        <Nav
          routes={sesifyModes}
          activeRoute={sesifyMode}
          onNavigate={(target) => actions.selectSesifyMode(target)}
        />
        <div className="buttonWrapper">
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
        globalUsagePackages={globalUsagePackages}
        packageModulesMode={packageModulesMode}
        selectedNode={selectedNode}
        packageModules={packageModules}
        selectedNodeLabel={selectedNodeLabel}
        selectedNodeData={selectedNodeData}
        moduleData={moduleData}
        viewSource={viewSource}
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
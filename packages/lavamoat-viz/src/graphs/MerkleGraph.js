const React = require('react')
const ObservableStore = require('obs-store')
const Tree = require('merkle-patricia-tree')
const pify = require('pify')

const ForceGraph = require('./ForceGraph')
const {
  createNode,
  createNodes,
  createLink,
  createLinkToNext,
  createLinkToRandomNonNext,
} = require('./util')

class MerkleGraph extends React.Component {
  constructor () {
    super()

    let graph = { nodes: [], links: [] }

    const graphStore = new ObservableStore(graph)
    this.graphStore = graphStore

    this.tree = new Tree()
    this.updateGraphFromTree()
  }

  async addEntry(key) {
    console.log('addEntry', key)
    const { tree } = this
    await pify(tree.put).call(tree, key, 'hello')
    await this.updateGraphFromTree()
  }

  async updateGraphFromTree () {
    const { tree } = this

    // await pify(tree.put).call(tree, 'ab1', 'hello')
    // await pify(tree.put).call(tree, 'ab2', 'hello')
    // await pify(tree.put).call(tree, 'ab3', 'hello')

    const graph = { nodes: [], links: [] }

    const treeNodes = await getAllNodes(tree)
    console.log(treeNodes)
    treeNodes.forEach(nodeData => {
      // add node
      const parentId = nodeData.nodeRef.toString('hex')
      if (isRawNode(nodeData.nodeRef)) return
      graph.nodes.push(createNode({ id: parentId }))
      // if (nodeData.node.type === 'leaf') return
      // add leaf
      nodeData.node.getChildren().forEach(childData => {
        const childRef = childData[1]
        const childId = childRef.toString('hex')
        if (isRawNode(childRef)) return
        console.log(nodeData, childData)
        console.log(`${parentId} -> ${childId}`)
        graph.links.push(createLink({ source: parentId, target: childId }))
      })
    })

    this.graphStore.putState(graph)
  }

  render () {
    return (
      <div>
        <input type="text" onKeyPress={(event) => {
          if (event.key !== 'Enter') return
          const key = event.target.value
          this.addEntry(key)
          // clear
          event.target.value = ''
        }
        }></input>
        <ForceGraph graphStore={this.graphStore}/>
      </div>
    )
  }
}

module.exports = MerkleGraph

async function getAllNodes(tree) {
  const nodes = []
  const result = await new Promise((resolve) => {
    tree._walkTrie(tree.root, (nodeRef, node, key, walkController) => {
      nodes.push({ key, node, nodeRef })
      walkController.next()
    }, resolve)
  })
  console.log('result', result)
  return nodes
}

async function getAllNonRawNodes(tree) {
  const nodes = await getAllNodes(tree)
  return nodes.filter(n => !isRawNode(n.node))
}

async function getAllDbNodes(tree) {
  const treeNodes = []
  await new Promise(resolve => {
    tree._findDbNodes(((nodeRef, node, key, next) => {
      treeNodes.push({ key, node, nodeRef })
      next()
    }), resolve)
  })
  return treeNodes
}

function isRawNode (node) {
  return Array.isArray(node) && !Buffer.isBuffer(node)
}

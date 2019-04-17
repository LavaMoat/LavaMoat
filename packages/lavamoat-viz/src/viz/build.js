module.exports = { buildGraph, mergeGraph }


function mergeGraph (oldGraph, newGraph, middlePoint) {
  const graph = {}
  // create index for faster lookups during merge
  const graphIndex = createGraphIndex(oldGraph)
  // merge old graph for existing nodes + links
  graph.nodes = newGraph.nodes.map((node) => {
    const oldNode = graphIndex.nodes[node.id]
    return Object.assign({}, middlePoint, oldNode, node)
  })
  graph.links = newGraph.links.map((link) => {
    return Object.assign({}, graphIndex.links[link.id], link)
  })
  return graph
}

function buildGraph (networkState, networkFilter, latencyMode) {
  const graph = { nodes: [], links: [] }

  // first add kitsunet nodes
  Object.keys(networkState).forEach((clientId) => {
    // const peerData = networkState[clientId].peers
    // const badResponse = (typeof peerData !== 'object')
    const newNode = { id: clientId, type: 'good' }
    graph.nodes.push(newNode)
  })

  // then links
  Object.entries(networkState).forEach(([clientId, clientData]) => {
    const clientStats = clientData.stats || {}
    const peers = clientStats.peers
    if (!peers) return

    Object.entries(peers).forEach(([peerId, peerStats]) => {
      // if connected to a missing node, create missing node
      const alreadyExists = !!graph.nodes.find(item => item.id === peerId)
      if (!alreadyExists) {
        const newNode = { id: peerId, type: 'missing' }
        graph.nodes.push(newNode)
      }
      const protocolNames = Object.keys(peerStats.protocols)
      // abort if network filter miss
      if (networkFilter && !protocolNames.some(name => name.includes(networkFilter))) return
      const peerData = clientData.peers[peerId]
      const ping = peerData ? peerData.ping : null
      const pingDistance = 60 * Math.log(ping || 1000)
      const distance = latencyMode ? pingDistance : 30
      const linkValue = 2
      const linkId = `${clientId}-${peerId}`
      const newLink = {
        id: linkId,
        source: clientId,
        target: peerId,
        value: linkValue,
        distance,
      }
      graph.links.push(newLink)
    })
  })

  return graph
}

function createGraphIndex (graph) {
  const graphIndex = { nodes: {}, links: {} }
  graph.nodes.forEach(node => {
    graphIndex.nodes[node.id] = node
  })
  graph.links.forEach(link => {
    graphIndex.links[link.id] = link
  })
  return graphIndex
}

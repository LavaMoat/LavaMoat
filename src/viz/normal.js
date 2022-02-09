// const h = require('virtual-dom/h')
// const s = require('virtual-dom/virtual-hyperscript/svg')
// const h = require('react-hyperscript')
const s = require('react-hyperscript')

const renderBaseGraph = require('./base.js')

module.exports = renderGraph

function renderGraph (state, actions) {
  return renderBaseGraph(state, actions, { renderNode, renderLink })
}

function renderNode (node, state, actions) {
  const { selectedNode } = state
  const isSelected = selectedNode === node.id

  const { color } = node
  const normalRadius = ('radius' in node) ? node.radius : 5
  const radius = isSelected ? (normalRadius * 2) : normalRadius
  const label = node.label || node.id

  return (

    s('circle', {
      r: radius,
      fill: color,
      cx: node.x,
      cy: node.y,
      onClick: () => actions.selectNode(node.id),
    }, [
      s('title', `${label}`),
    ])

  )
}

/* eslint-disable-next-line no-unused-vars */
function renderLink (link, state, actions) {
  const { source, target } = link
  return (

    s('line', {
      strokeWidth: link.value,
      x1: source.x,
      y1: source.y,
      x2: target.x,
      y2: target.y,
    })

  )
}

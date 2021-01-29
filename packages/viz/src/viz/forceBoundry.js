// modified from https://github.com/d3/d3-force/pull/115/

/* eslint-disable */

function constant (x) {
  return function () {
    return x
  }
}

export default function (x0, y0, x1, y1) {
  console.log('boundry params', x0, y0, x1, y1)
  let strength = constant(0.1)
  let hardBoundary = true
  let border = constant(Math.min((x1 - x0) / 2, (y1 - y0) / 2))
  let nodes
  let strengthsX
  let strengthsY
  let x0z; let x1z
  let y0z; let y1z
  let borderz
  let halfX; let halfY

  if (typeof x0 !== 'function') {
    x0 = constant(x0 == null ? -100 : Number(x0))
  }
  if (typeof x1 !== 'function') {
    x1 = constant(x1 == null ? 100 : Number(x1))
  }
  if (typeof y0 !== 'function') {
    y0 = constant(y0 == null ? -100 : Number(y0))
  }
  if (typeof y1 !== 'function') {
    y1 = constant(y1 == null ? 100 : Number(y1))
  }

  function getVx (halfX, x, strengthX, border, alpha) {
    return (halfX - x) * Math.min(2, Math.abs(halfX - x) / halfX) * strengthX * alpha
  }

  function force (alpha) {
    for (var i = 0, n = nodes.length, node; i < n; ++i) {
      node = nodes[i]

      if ((node.x < (x0z[i] + borderz[i]) || node.x > (x1z[i] - borderz[i])) ||
          (node.y < (y0z[i] + borderz[i]) || node.y > (y1z[i] - borderz[i]))) {
        node.vx += getVx(halfX[i], node.x, strengthsX[i], borderz[i], alpha)
        node.vy += getVx(halfY[i], node.y, strengthsY[i], borderz[i], alpha)
      }

      if (hardBoundary) {
        if (node.x >= x1z[i]) {
          node.vx += x1z[i] - node.x
        }
        if (node.x <= x0z[i]) {
          node.vx += x0z[i] - node.x
        }
        if (node.y >= y1z[i]) {
          node.vy += y1z[i] - node.y
        }
        if (node.y <= y0z[i]) {
          node.vy += y0z[i] - node.y
        }
      }
    }
  }

  function initialize () {
    if (!nodes) {
      return
    }
    let i; const n = nodes.length
    strengthsX = new Array(n)
    strengthsY = new Array(n)
    x0z = new Array(n)
    y0z = new Array(n)
    x1z = new Array(n)
    y1z = new Array(n)
    halfY = new Array(n)
    halfX = new Array(n)
    borderz = new Array(n)

    for (i = 0; i < n; ++i) {
      strengthsX[i] = (isNaN(x0z[i] = Number(x0(nodes[i], i, nodes))) ||
        isNaN(x1z[i] = Number(x1(nodes[i], i, nodes)))) ? 0 : Number(strength(nodes[i], i, nodes))
      strengthsY[i] = (isNaN(y0z[i] = Number(y0(nodes[i], i, nodes))) ||
        isNaN(y1z[i] = Number(y1(nodes[i], i, nodes)))) ? 0 : Number(strength(nodes[i], i, nodes))
      halfX[i] = x0z[i] + (x1z[i] - x0z[i]) / 2
      halfY[i] = y0z[i] + (y1z[i] - y0z[i]) / 2
      borderz[i] = Number(border(nodes[i], i, nodes))
    }
  }

  force.initialize = function (_) {
    nodes = _
    initialize()
  }

  force.x0 = function (_) {
    return arguments.length ? (x0 = typeof _ === 'function' ? _ : constant(Number(_)), initialize(), force) : x0
  }

  force.x1 = function (_) {
    return arguments.length ? (x1 = typeof _ === 'function' ? _ : constant(Number(_)), initialize(), force) : x1
  }

  force.y0 = function (_) {
    return arguments.length ? (y0 = typeof _ === 'function' ? _ : constant(Number(_)), initialize(), force) : y0
  }

  force.y1 = function (_) {
    return arguments.length ? (y1 = typeof _ === 'function' ? _ : constant(Number(_)), initialize(), force) : y1
  }

  force.strength = function (_) {
    return arguments.length ? (strength = typeof _ === 'function' ? _ : constant(Number(_)), initialize(), force) : strength
  }

  force.border = function (_) {
    return arguments.length ? (border = typeof _ === 'function' ? _ : constant(Number(_)), initialize(), force) : border
  }

  force.hardBoundary = function (_) {
    return arguments.length ? (hardBoundary = _, force) : hardBoundary
  }

  return force
}

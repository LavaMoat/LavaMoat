const ModelViewer = require('metamask-logo')

// To render with fixed dimensions:
const viewer = ModelViewer({

  // Dictates whether width & height are px or multiplied
  pxNotRatio: true,
  width: 500,
  height: 400,
  // pxNotRatio: false,
  // width: 0.9,
  // height: 0.9,

  // To make the face follow the mouse.
  followMouse: false,

  // head should slowly drift (overrides lookAt)
  slowDrift: false,

})

// add viewer to DOM
const container = document.body
container.appendChild(viewer.container)

// look at something on the page
viewer.lookAt({
  x: 100,
  y: 100,
})

// enable mouse follow
viewer.setFollowMouse(true)

// add metamask text
const textElement = document.createElement('div')
textElement.innerText = 'LavaMoat made with love by MetaMask'
container.appendChild(textElement)
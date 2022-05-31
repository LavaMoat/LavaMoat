import { Points, PointsMaterial, ShaderMaterial } from 'three'
import BufferGeometryController from './buffer-geometry-controller.js'

const vertexShader = `
attribute float scale;
attribute vec3 color;
varying vec3 vColor;
void main() {
  vColor = color;
  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  gl_PointSize = scale * ( 300.0 / - mvPosition.z );
  gl_Position = projectionMatrix * mvPosition;
}
`

const fragmentShader = `
varying vec3 vColor;
vec3 baseColor = vec3(1.0, 1.0, 1.0);
void main() {
  if ( length( gl_PointCoord - vec2( 0.5, 0.5 ) ) > 0.475 ) discard;
  gl_FragColor = vec4( baseColor, 1.0 );
}
`

export class PointsController extends BufferGeometryController {
  constructor ({ ...args } = {}) {
    super({
      attributeSizes: {
        color: [3, 1]
        // scale: [1, 1],
      },
      ...args
    })
  }

  createMaterial ({ size = 5 }) {
    return new PointsMaterial({
      size,
      sizeAttenuation: true,
      vertexColors: true
    })
    // return new ShaderMaterial({
    //   vertexShader,
    //   fragmentShader,
    // });
  }

  createObject (geometry, material) {
    return new Points(geometry, material)
  }
}

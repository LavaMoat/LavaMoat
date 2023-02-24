import { Mesh, CircleGeometry, Points, PointsMaterial, ShaderMaterial, RawShaderMaterial, TextureLoader } from 'three'
import { InstancedBufferGeometryController } from './buffer-geometry-controller.js'

const vertexShader2 = `
precision highp float;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

attribute vec3 position;
attribute vec2 uv;
attribute vec3 translate;
attribute vec3 color;
attribute float size;

varying vec2 vUv;
varying vec3 vColor;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4( translate, 1.0 );


	vec3 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
	scale.z = length( vec3( modelMatrix[ 2 ].x, modelMatrix[ 2 ].y, modelMatrix[ 2 ].z ) );

  mvPosition.xyz += position * scale * size;
  gl_Position = projectionMatrix * mvPosition;
  
  vUv = uv;
  vColor = color;
}
`

const fragmentShader2 = `
precision highp float;

uniform sampler2D map;

varying vec2 vUv;
varying vec3 vColor;

void main() {
  vec4 diffuseColor = texture2D( map, vUv );
  if ( diffuseColor.w < 0.5 ) discard;
  gl_FragColor = vec4( diffuseColor.xyz * vColor, diffuseColor.w );
}
`

export class PointsController extends InstancedBufferGeometryController {
  constructor ({ ...args } = {}) {
    super({
      attributeSizes: {
        position: [3, 1],
        normal: [3, 1],
        uv: [2, 1],
      },
      instancedAttributeSizes: {
        translate: [3, 1],
        color: [3, 1],
        size: [1, 1],
      },
      ...args,
    })
    const circleGeometry = new CircleGeometry( 1, 6 )
    this.geometry.index = circleGeometry.index
    // copy circle geometry attributes
    this.geometry.setAttribute('position', circleGeometry.attributes.position)
    this.geometry.setAttribute('normal', circleGeometry.attributes.normal)
    this.geometry.setAttribute('uv', circleGeometry.attributes.uv)
  }

  createMaterial () {
    return new RawShaderMaterial({
      uniforms: {
        'map': { value: new TextureLoader().load( 'assets/circle.png' ) },
      },
      vertexShader: vertexShader2,
      fragmentShader: fragmentShader2,
      depthTest: true,
      depthWrite: true,
    })
  }

  createObject (geometry, material) {
    const mesh = new Mesh( geometry, material )
    return mesh
  }
}

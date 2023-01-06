import { Points, PointsMaterial, ShaderMaterial } from 'three'
import BufferGeometryController from './buffer-geometry-controller.js'

const vertexShader = `
attribute float size;
attribute vec3 customColor;

varying vec3 vColor;

void main() {

  vColor = customColor;

  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

  gl_PointSize = size * ( 300.0 / -mvPosition.z );

  gl_Position = projectionMatrix * mvPosition;

}
`
// const vertexShader = `
// uniform float size;
// uniform float scale;
// #include <common>
// #include <color_pars_vertex>
// #include <fog_pars_vertex>
// #include <morphtarget_pars_vertex>
// #include <logdepthbuf_pars_vertex>
// #include <clipping_planes_pars_vertex>
// void main() {
// 	#include <color_vertex>
// 	#include <begin_vertex>
// 	#include <morphtarget_vertex>
// 	#include <project_vertex>
// 	gl_PointSize = size;
// 	#ifdef USE_SIZEATTENUATION
// 		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
// 		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
// 	#endif
// 	#include <logdepthbuf_vertex>
// 	#include <clipping_planes_vertex>
// 	#include <worldpos_vertex>
// 	#include <fog_vertex>
// }
// `

const fragmentShader = `
uniform vec3 color;
uniform sampler2D pointTexture;

varying vec3 vColor;

void main() {

  gl_FragColor = vec4( color * vColor, 1.0 );
  gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );

}
`
// const fragmentShader = `
// uniform vec3 diffuse;
// uniform float opacity;
// #include <common>
// #include <color_pars_fragment>
// #include <map_particle_pars_fragment>
// #include <fog_pars_fragment>
// #include <logdepthbuf_pars_fragment>
// #include <clipping_planes_pars_fragment>
// void main() {
// 	#include <clipping_planes_fragment>
// 	vec3 outgoingLight = vec3( 0.0 );
// 	vec4 diffuseColor = vec4( diffuse, opacity );
// 	#include <logdepthbuf_fragment>
// 	#include <map_particle_fragment>
// 	#include <color_fragment>
// 	#include <alphatest_fragment>
// 	outgoingLight = diffuseColor.rgb;
// 	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
// 	#include <tonemapping_fragment>
// 	#include <encodings_fragment>
// 	#include <fog_fragment>
// 	#include <premultiplied_alpha_fragment>
// }
// `

export class PointsController extends BufferGeometryController {
  constructor ({ ...args } = {}) {
    super({
      attributeSizes: {
        color: [3, 1],
        // scale: [1, 1],
        size: [1, 1]
      },
      ...args
    })
  }

  createMaterial ({ size = 5 }) {
    const mat = new PointsMaterial({
      size,
      sizeAttenuation: true,
      vertexColors: true
    })
    mat.onBeforeCompile = ( shader, renderer ) => {
      debugger
    }
    return mat
    // return new ShaderMaterial({
    //   vertexShader,
    //   fragmentShader,
    //   size,
    //   sizeAttenuation: true,
    //   vertexColors: true
    // });
  }

  createObject (geometry, material) {
    return new Points(geometry, material)
  }
}

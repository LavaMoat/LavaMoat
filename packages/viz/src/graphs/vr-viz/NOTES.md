# some hard won knowledge on getting this to work

- the primary development device for this project what the "Meta Quest 2"
- due to resource constraints on the device, it was important to optimize the rendering in order to achieve comfortable frame rates
- the primary way this was achieved was by using Threejs's InstancedBufferGeometry to unify draw calls. This is abstracted via our custom InstancedBufferGeometryController that handles managing of the instances.
- Unifying the graph nodes as a single object provides perf benefits but undermines the ray tracing test for selecting items. In order to fix this, we also create individual objects for each node that are marked as visible=false so they are not rendered. we then hit test against those objects for hover/selection.
- current implementation contains many shortcommings. all node sprites point the same direction instead of pointing at the camera. the current implemementation has outgrown three-forcegraph, as you can see from all the dummy objects created in linkThreeObject.
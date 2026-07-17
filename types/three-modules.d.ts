// `three` ships no bundled types in this version and @types/three isn't
// installed, so other three imports resolve loosely too. Match that here
// rather than pulling in a types dependency just for this prototype.
declare module 'three/examples/jsm/objects/MarchingCubes' {
  const MarchingCubes: any;
  export { MarchingCubes };
}

declare module 'three' {
  const THREE: any;
  export = THREE;
}

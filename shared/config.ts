/**
 * Feature flags for swapping between alternative rendering approaches.
 */

// Render same-coloured puyos as merging metaball blobs (see PuyoMetaballs)
// instead of separate discrete spheres. Flip to false to revert.
export const ENABLE_METABALL_PUYOS = true;

// Render puyos via a raymarched signed-distance-field fragment shader (see
// PuyoRaymarch) instead of marching-cubes metaballs. Takes priority over
// ENABLE_METABALL_PUYOS when true. An alternative approach to the same
// same-colour-merging problem — parked side by side with the marching-cubes
// version rather than replacing it, so either can be flipped back on.
export const ENABLE_RAYMARCH_PUYOS = true;

// Adds a very slight per-ball idle wobble to PuyoRaymarch's render
// position (out of phase per ball, so they don't move in unison). Purely
// cosmetic — kept behind its own flag since it's the kind of thing worth
// being able to quickly A/B or disable if it ever reads as jittery rather
// than "alive".
export const ENABLE_PUYO_WOBBLE = true;

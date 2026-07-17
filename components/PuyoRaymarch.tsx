import { extend, useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import React from 'react';
import * as THREE from 'three';
import { Grid, Puyos, PuyoColour, puyoColours } from '../store/store';
import { getPuyoGroups, getPuyoPosition, PuyoGroup } from '../shared/grid';

// ---------------------------------------------------------------------------
// Alternative to PuyoMetaballs: instead of marching-cubes geometry, this
// raymarches a signed-distance field (spheres, one per puyo) directly in a
// fragment shader covering the whole board. Same-colour balls blend via a
// polynomial smooth-min of their SDFs; different colours take a hard min
// (whichever is closer wins outright), so only same-coloured puyos ever
// visually merge — no discrete grouping/component-per-cluster needed at
// all, since the entire board renders through one shader.
// ---------------------------------------------------------------------------

// Board is 6 columns × 14 rows, top 2 rows hidden (queued) — 72 is the true
// visible ceiling. GLSL array uniforms need a fixed size, so this doubles as
// a hard cap; overflow beyond it is silently dropped (same as a real game
// would already be well into a losing state).
const MAX_BALLS = 72;

const COLOUR_INDEX: Record<PuyoColour, number> = puyoColours.reduce(
  (acc, colour, index) => ({ ...acc, [colour]: index }),
  {} as Record<PuyoColour, number>,
);

const COLOUR_HEX: Record<PuyoColour, string> = {
  [PuyoColour.BLUE]: '#2563EB',
  [PuyoColour.RED]: '#DC2626',
  [PuyoColour.YELLOW]: '#CA8A04',
  [PuyoColour.GREEN]: '#15803D',
  [PuyoColour.PURPLE]: '#9333EA',
};

// Position smoothing — identical in spirit to PuyoMetaballs' spring (see
// that file for the fuller rationale): critically damped so a ball still
// accelerates into place like gravity but never overshoots, since overshoot
// would oscillate the exact distance the SDF blend reacts to.
const SPRING_ANGULAR_FREQUENCY = 15; // rad/s
const SPRING_DAMPING_RATIO = 1;
const SPRING_MAX_DELTA_SECONDS = 1 / 30;

// How long a user-piece rotation's 90° sweep around its pivot takes.
const ROTATION_ARC_DURATION_SECONDS = 0.2;

// Two point lights, in cellSize units relative to the board's centre —
// echoing the original spheres' scene (a directionalLight and a pointLight),
// but deliberately much closer than either of those: the whole point of a
// *point* light over a directional one is that its direction to a surface
// point depends on that point's actual position, and that effect is only
// dramatic when the light's distance is comparable to the board's own size,
// not many times larger (a "few cellSizes away" light is still close to
// directional in practice — the direction barely changes end to end).
// Y is just above the board's own visible top edge (~5.9 cellSize) so the
// key light stays above every ball's position (never flips to "lighting
// from below" as a piece nears the top) while still being close enough
// that a ball's own vertical position swings the light's angle hugely as
// it falls — from a shallow, near-overhead glint near the top of the board
// to a much steeper, more raking one near the bottom.
//
// X/Y signs match the original spheres' scene, which puts its highlights
// top-right (directionalLight, positive X and Y) and bottom-centre
// (pointLight, X = 0, negative Y).
const LIGHT_POS_CELLS: [number, number, number] = [2, 7, 2];
const FILL_LIGHT_POS_CELLS: [number, number, number] = [-2, -6, 1.5];

// Fraction of cellSize a ball's radius should end up as — matches
// PuyoMetaballs' TARGET_RADIUS_RATIO so the two approaches are a fair
// side-by-side comparison.
const TARGET_RADIUS_RATIO = 0.425;

// Smooth-min blend radius, as a fraction of a ball's own radius. Higher =
// same-coloured balls start blending into each other from further apart,
// and the neck between two touching balls rounds out more.
//
// Grid-adjacent puyos' surfaces are only ~0.14 × cellSize apart (radius is
// 0.43 × cellSize each, centres 1 × cellSize apart), so the blend radius
// needs to be several times that gap for the smooth-min to actually round
// the join into a plump merge rather than a thin, barely-there neck — a
// blend radius comparable to the gap itself only produces a subtle dimple
// (its max sag at the midpoint is roughly blendRadius / 4).
const SMOOTH_MIN_RATIO = 1.2;

// Shading — how bright/glossy the balls look. Key = the closer, upper-right
// point light; fill = the dimmer one from below (see LIGHT_POS_CELLS /
// FILL_LIGHT_POS_CELLS above).
const AMBIENT_INTENSITY = 0.55; // flat base brightness, lit or not
const KEY_DIFFUSE_INTENSITY = 1.05;
const FILL_DIFFUSE_INTENSITY = 0.45;
const KEY_SPECULAR_INTENSITY = 1.15;
const FILL_SPECULAR_INTENSITY = 0.75;
const SPECULAR_SHININESS = 100; // higher = tighter, smaller highlight
const FRESNEL_INTENSITY = 0.3; // rim brightening at grazing angles
const FRESNEL_POWER = 3; // higher = the rim stays narrower/tighter

// Sink (clear) animation — a cleared cluster's balls shrink away one after
// another rather than all at once. Values match PuyoMetaballs' own
// SINK_DURATION_SECONDS/STAGGER_SECONDS: Game.tsx's collapse-puyos delay
// (getSinkAnimationDurationSeconds, exported from PuyoMetaballs) is only
// aware of that file, not which renderer is actually active, so keeping
// these in sync keeps the game's timing matched to what's actually on
// screen regardless of ENABLE_RAYMARCH_PUYOS.
const SINK_DURATION_SECONDS = 0.35;
const STAGGER_SECONDS = 0.05;

// Post-clear collapse: settled (non-active) puyos dropping into the gap
// left by a clear. Delaying each one by its own column keeps them all
// falling with the same spring (no separate animation system needed) but
// staggers *when* each column's spring starts chasing its new position, so
// a multi-column collapse reads as a gentle wave settling left to right
// instead of every affected puyo dropping in perfect lockstep.
const COLLAPSE_STAGGER_SECONDS = 0.05;
// Within a column, additional per-rank delay so multiple simultaneously
// -collapsing balls in the same column don't all drop in lockstep either —
// the lowest (highest-row) one starts first, each one above it joining in
// shortly after, like a trickle down the column.
const COLLAPSE_ROW_STAGGER_SECONDS = 0.05;

// Slightly underdamped (vs. the critically-damped SPRING_DAMPING_RATIO
// used everywhere else) — gives a collapsing puyo a small overshoot/bounce
// as it settles into place. Deliberately kept close to 1 (barely
// underdamped, not the bouncier ~0.6 tried and reverted for the falling
// piece elsewhere in this project's history): any overshoot briefly
// changes a ball's rendered distance to same-coloured neighbours, which is
// exactly what the SDF blend below reacts to — risk is much lower here
// (one brief bounce on landing, not a continuously-bouncing falling piece)
// but not zero, so this stays subtle rather than pronounced.
const SPRING_DAMPING_RATIO_COLLAPSE_BOUNCE = 0.6;

// Matches PuyoMetaballs' easeInCubic — keeps accelerating right up to t=1
// instead of flattening out, so a shrinking ball doesn't linger at any one
// size for many frames (particularly near-zero, sub-voxel-equivalent size).
function easeInCubic(t: number) {
  return t * t * t;
}

type PositionMap = Map<string, [number, number]>;
type VelocityMap = Map<string, [number, number]>;

// A cleared, grid-adjacent cluster (matching the game's actual clear
// logic), frozen at the moment it disappeared from the grid so it can
// shrink away in place — see the clear-detection effect below.
type ExitingGroup = {
  key: string;
  colourIndex: number;
  positions: [number, number][];
  elapsed: number;
};

type RotationArc = {
  pivotId: string;
  orbiterId: string;
  startAngle: number;
  targetAngle: number;
  elapsed: number;
};

type Props = {
  grid: Grid;
  puyos: Puyos;
  cellSize: number;
  userPuyoIds: [string, string];
};

function normalizeAngleDelta(delta: number) {
  const twoPi = Math.PI * 2;
  return ((((delta + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI;
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

const vertexShader = /* glsl */ `
  varying vec2 vXY;

  void main() {
    vXY = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  #define MAX_BALLS ${MAX_BALLS}
  #define NUM_COLOURS 5
  #define MAX_STEPS 40

  varying vec2 vXY;

  // Shading tuning — real uniforms (not #defines) specifically so editing
  // the JS constants they're fed from (see the component below) takes
  // effect on save. A #define bakes its value into the compiled shader
  // program at material-construction time, and Fast Refresh re-renders the
  // component without reconstructing an already-mounted material, so a
  // #define'd value would only ever update after a full page reload.
  uniform float uAmbientIntensity;
  uniform float uKeyDiffuseIntensity;
  uniform float uFillDiffuseIntensity;
  uniform float uKeySpecularIntensity;
  uniform float uFillSpecularIntensity;
  uniform float uSpecularShininess;
  uniform float uFresnelIntensity;
  uniform float uFresnelPower;

  uniform vec2 uBallPos[MAX_BALLS];
  uniform float uBallColour[MAX_BALLS];
  // Per-ball multiplier on uBallBaseRadius — 1.0 for a live ball, ramping
  // down to 0 as a cleared ball shrinks away (see the sink/clear animation
  // in the component below).
  uniform float uBallRadiusScale[MAX_BALLS];
  uniform int uBallCount;
  uniform float uBallBaseRadius;
  uniform float uSmoothK;
  uniform float uMarchRange;
  uniform vec3 uColours[NUM_COLOURS];
  uniform vec3 uLightPos;
  uniform vec3 uFillLightPos;

  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  // Distance to the nearest surface, plus (via hitColour) which colour it
  // belongs to. Same-colour balls blend smoothly into one another; the
  // result across colours is a hard min, so different colours never blend —
  // only whichever is actually closer is drawn.
  float sceneSDF(vec3 p, out int hitColour) {
    float best = 1.0e4;
    int bestColour = -1;

    for (int c = 0; c < NUM_COLOURS; c++) {
      float colourDist = 1.0e4;
      bool any = false;

      for (int i = 0; i < MAX_BALLS; i++) {
        if (i >= uBallCount) break;

        if (int(uBallColour[i]) == c) {
          float radius = uBallBaseRadius * uBallRadiusScale[i];
          float d = length(p - vec3(uBallPos[i], 0.0)) - radius;
          colourDist = smin(colourDist, d, uSmoothK);
          any = true;
        }
      }

      if (any && colourDist < best) {
        best = colourDist;
        bestColour = c;
      }
    }

    hitColour = bestColour;
    return best;
  }

  vec3 sceneNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    int c;
    float dx = sceneSDF(p + e.xyy, c) - sceneSDF(p - e.xyy, c);
    float dy = sceneSDF(p + e.yxy, c) - sceneSDF(p - e.yxy, c);
    float dz = sceneSDF(p + e.yyx, c) - sceneSDF(p - e.yyx, c);
    return normalize(vec3(dx, dy, dz));
  }

  void main() {
    if (uBallCount == 0) {
      discard;
    }

    // Coarse reject before raymarching at all: the ray at this pixel only
    // ever travels along Z at a fixed XY, so the closest any ball's surface
    // can ever get is its own 2D (XY-only) distance to this pixel. Most of
    // the board is empty at any moment, so this skips the expensive part
    // (looping every colour × every ball, every march step) for the vast
    // majority of pixels. The margin is a few world units wider than the
    // blend radius alone so it doesn't clip the anti-aliased edge below.
    float nearest = 1.0e4;
    for (int i = 0; i < MAX_BALLS; i++) {
      if (i >= uBallCount) break;
      nearest = min(nearest, length(vXY - uBallPos[i]));
    }
    if (nearest - uBallBaseRadius > uSmoothK + 3.0) {
      discard;
    }

    // The actual anti-aliased silhouette/coverage test — and, unlike the
    // raymarch below, not an approximation. Every ball is a sphere centred
    // at z = 0, and the camera is orthographic (a constant, straight-down
    // -Z view ray per pixel), so a ball's own outer edge as seen on screen
    // is *exactly* the scene's distance field evaluated at z = 0 — no
    // marching needed. fwidth() turns that one signed-distance value into
    // a clean, ~1px-wide analytic fade right at the edge. (An earlier
    // version derived alpha from how close the raymarch below got to
    // converging, which is noisy near grazing/silhouette angles — where a
    // ray travels nearly parallel to the surface, sphere tracing takes many
    // more steps to converge than near the centre of a ball — and that
    // noise showed up as a visible ring and extra jagged-looking edges.)
    int edgeColour;
    float edgeDist = sceneSDF(vec3(vXY, 0.0), edgeColour);

    float aa = fwidth(edgeDist) + 0.0001;
    float alpha = clamp(0.5 - edgeDist / aa, 0.0, 1.0);

    if (alpha < 0.003) {
      discard;
    }

    // From here on, the raymarch is purely to find a *shading* position
    // (for the normal/lighting) — coverage/alpha is already decided above,
    // so an imperfect shading position within the last sliver of pixels
    // right at the edge (where convergence is slowest) is imperceptible
    // once it's already being faded toward transparent.
    vec3 rayOrigin = vec3(vXY, uMarchRange);
    vec3 rayDir = vec3(0.0, 0.0, -1.0);
    float totalDist = uMarchRange * 2.0;

    float traveled = 0.0;
    bool hit = false;
    vec3 hitPos = rayOrigin;
    int hitColour = edgeColour;

    // Fallback shading position/colour if the march never actually
    // converges (only ever happens right at a grazing silhouette angle,
    // already faded near-transparent by alpha above).
    float minDist = 1.0e4;
    vec3 minDistPos = rayOrigin;
    int minDistColour = edgeColour;

    for (int i = 0; i < MAX_STEPS; i++) {
      vec3 p = rayOrigin + rayDir * traveled;
      int c;
      float d = sceneSDF(p, c);

      if (d < minDist) {
        minDist = d;
        minDistPos = p;
        minDistColour = c;
      }

      if (d < 0.001) {
        hit = true;
        hitPos = p;
        hitColour = c;
        break;
      }

      traveled += d;

      if (traveled > totalDist) {
        break;
      }
    }

    if (!hit) {
      hitPos = minDistPos;
      hitColour = minDistColour;
    }

    vec3 normal = sceneNormal(hitPos);

    // Two real point lights (actual positions, not just directions) — the
    // direction to each is recomputed per fragment from hitPos, so both
    // vary across a single ball's own surface *and* between balls in
    // different parts of the board, the way a directional-only light
    // (fixed direction everywhere) never would. Matches the original
    // spheres' scene, which lights them with a key (directionalLight) and
    // a dimmer fill from below (pointLight) — two separate highlights on a
    // shiny surface, not just one.
    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    vec3 lightDir = normalize(uLightPos - hitPos);
    float diffuse = max(dot(normal, lightDir), 0.0);
    vec3 reflectDir = reflect(-lightDir, normal);
    float specular = pow(max(dot(reflectDir, viewDir), 0.0), uSpecularShininess);

    vec3 fillLightDir = normalize(uFillLightPos - hitPos);
    float fillDiffuse = max(dot(normal, fillLightDir), 0.0);
    vec3 fillReflectDir = reflect(-fillLightDir, normal);
    float fillSpecular = pow(max(dot(fillReflectDir, viewDir), 0.0), uSpecularShininess);

    // Fresnel-style rim, brightest where the surface grazes away from the
    // view direction — sells the "wet plastic" look low-roughness materials
    // get from environment reflections, which this shader has no actual
    // environment map to reflect.
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), uFresnelPower);

    vec3 base = uColours[hitColour];
    vec3 colour =
      base * (uAmbientIntensity + diffuse * uKeyDiffuseIntensity + fillDiffuse * uFillDiffuseIntensity) +
      vec3(1.0) * (specular * uKeySpecularIntensity + fillSpecular * uFillSpecularIntensity) +
      base * fresnel * uFresnelIntensity;

    gl_FragColor = vec4(colour, alpha);
  }
`;

const RaymarchPuyoMaterialImpl = shaderMaterial(
  {
    uBallPos: Array.from({ length: MAX_BALLS }, () => new THREE.Vector2()),
    uBallColour: new Array(MAX_BALLS).fill(0),
    uBallRadiusScale: new Array(MAX_BALLS).fill(1),
    uBallCount: 0,
    uBallBaseRadius: 1,
    uSmoothK: 1,
    uMarchRange: 1,
    uColours: puyoColours.map((colour) => new THREE.Color(COLOUR_HEX[colour])),
    uLightPos: new THREE.Vector3(),
    uFillLightPos: new THREE.Vector3(),
    uAmbientIntensity: AMBIENT_INTENSITY,
    uKeyDiffuseIntensity: KEY_DIFFUSE_INTENSITY,
    uFillDiffuseIntensity: FILL_DIFFUSE_INTENSITY,
    uKeySpecularIntensity: KEY_SPECULAR_INTENSITY,
    uFillSpecularIntensity: FILL_SPECULAR_INTENSITY,
    uSpecularShininess: SPECULAR_SHININESS,
    uFresnelIntensity: FRESNEL_INTENSITY,
    uFresnelPower: FRESNEL_POWER,
  },
  vertexShader,
  fragmentShader,
  (self: any) => {
    // fwidth() (used for the silhouette anti-aliasing above) needs this
    // extension under WebGL1; a no-op under WebGL2, where it's core.
    self.extensions.derivatives = true;
    // The AA fade band blends its edge alpha against whatever's behind
    // (the board's grid lines) instead of being clipped to fully opaque.
    self.transparent = true;
    self.depthWrite = false;
  },
);

extend({ RaymarchPuyoMaterial: RaymarchPuyoMaterialImpl });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      raymarchPuyoMaterial: any;
    }
  }
}

/**
 * Raymarched-SDF alternative to PuyoMetaballs — see the file-level comment
 * above for the approach. Feature-flagged via ENABLE_RAYMARCH_PUYOS
 * (shared/config.ts); parked alongside the marching-cubes version rather
 * than replacing it.
 */
export const PuyoRaymarch: React.FC<Props> = ({
  grid,
  puyos,
  cellSize,
  userPuyoIds,
}) => {
  const materialRef = React.useRef<any>(null);
  const positionsRef = React.useRef<PositionMap>(new Map());
  const velocitiesRef = React.useRef<VelocityMap>(new Map());
  const rotationArcRef = React.useRef<RotationArc | null>(null);
  const previousUserCellsRef = React.useRef<Map<string, [number, number]>>(
    new Map(),
  );
  // Last-seen row per (non-active) id — used only to detect a post-clear
  // collapse (see the effect below), and how long each newly-collapsing id
  // should still hold its old position before its spring starts chasing
  // the new one.
  const previousRowsRef = React.useRef<Map<string, number>>(new Map());
  const collapseDelayRef = React.useRef<Map<string, number>>(new Map());
  // Ids currently mid-bounce from a just-released collapse delay — see
  // SPRING_DAMPING_RATIO_COLLAPSE_BOUNCE above. Removed once the ball has
  // actually settled (close to its target, barely moving), so the
  // underdamped ratio only applies during the brief landing bounce itself.
  const collapseBouncingRef = React.useRef<Set<string>>(new Set());
  // Every live id's most recent grid (column, row) — kept even after an id
  // disappears from the grid (cleared), so at the instant it clears, its
  // *last* position is still available to order the sink animation's
  // stagger below (bottom-most, then left-most, first).
  const lastKnownGridPositionRef = React.useRef<Map<string, [number, number]>>(
    new Map(),
  );
  const ballPositionsRef = React.useRef(
    Array.from({ length: MAX_BALLS }, () => new THREE.Vector2()),
  );
  const ballColoursRef = React.useRef(new Array(MAX_BALLS).fill(0));
  const ballRadiusScalesRef = React.useRef(new Array(MAX_BALLS).fill(1));
  const lightPosRef = React.useRef(new THREE.Vector3());
  const fillLightPosRef = React.useRef(new THREE.Vector3());
  const exitingGroupsRef = React.useRef<ExitingGroup[]>([]);
  const exitKeyRef = React.useRef(0);
  const previousClusterGroupsRef = React.useRef<PuyoGroup[]>([]);

  // Hide top two rows for new puyos, same as PuyoMetaballs/old ThreeBoard
  // rendering.
  const hideQueuedIds = React.useCallback(
    (rawGroups: PuyoGroup[]): PuyoGroup[] =>
      rawGroups
        .map((group) => ({
          ...group,
          ids: group.ids.filter((id) => {
            const [, row] = getPuyoPosition(grid, id);
            return row !== null && row > 1;
          }),
        }))
        .filter((group) => group.ids.length > 0),
    [grid],
  );

  const visibleIds = React.useMemo(
    () =>
      Object.keys(puyos).filter((id) => {
        const [, row] = getPuyoPosition(grid, id);
        return row !== null && row > 1;
      }),
    [grid, puyos],
  );

  // A connected (strictly grid-adjacent) grouping, matching the game's
  // actual connected-4 clear logic — used only to detect a specific cluster
  // clearing (below), so its sink-away animation can start.
  const clusterGroups = React.useMemo(
    () => hideQueuedIds(getPuyoGroups(grid, puyos)),
    [grid, puyos, hideQueuedIds],
  );

  // Tracks every live id's grid position — see lastKnownGridPositionRef
  // above for why (it's what lets the effect below know a cleared group's
  // spatial layout even though the ids are already gone from the grid).
  React.useLayoutEffect(() => {
    Object.keys(puyos).forEach((id) => {
      const [column, row] = getPuyoPosition(grid, id);

      if (column !== null && row !== null) {
        lastKnownGridPositionRef.current.set(id, [column, row]);
      }
    });
  }, [grid, puyos]);

  // Detects a cluster vanishing from the grid entirely (all at once — a
  // clear, not a puyo just moving) and hands it off to the sink/shrink
  // animation in useFrame below, using each member's last known live
  // position. useLayoutEffect (not useEffect) so this runs — and
  // exitingGroupsRef is updated — before the next paint, matching
  // PuyoMetaballs' identical reasoning for avoiding a one-frame pop where
  // the cluster would otherwise just vanish before its sink-away starts.
  React.useLayoutEffect(() => {
    const newlyCleared = previousClusterGroupsRef.current.filter((group) =>
      group.ids.every((id) => {
        const [column, row] = getPuyoPosition(grid, id);
        return column === null || row === null;
      }),
    );

    if (newlyCleared.length > 0) {
      newlyCleared.forEach((group) => {
        exitKeyRef.current += 1;

        // Bottom-most (highest row), then left-most, so the group shrinks
        // away starting from its lowest balls and sweeping upward — same
        // per-index STAGGER_SECONDS delay as before (see useFrame below),
        // just applied in this spatially meaningful order instead of
        // getPuyoGroups' arbitrary traversal order.
        const sortedIds = group.ids.slice().sort((a, b) => {
          const posA = lastKnownGridPositionRef.current.get(a);
          const posB = lastKnownGridPositionRef.current.get(b);

          if (!posA || !posB) {
            return 0;
          }

          const [columnA, rowA] = posA;
          const [columnB, rowB] = posB;

          return rowB - rowA || columnA - columnB;
        });

        exitingGroupsRef.current.push({
          key: `exit-${exitKeyRef.current}`,
          colourIndex: COLOUR_INDEX[group.colour],
          positions: sortedIds.map(
            (id) => positionsRef.current.get(id) ?? [0, 0],
          ),
          elapsed: 0,
        });
      });
    }

    previousClusterGroupsRef.current = clusterGroups;
  }, [clusterGroups, grid]);

  // Detects a settled (non-active) puyo's row increasing — the only way
  // that happens is the post-clear collapse (collapsePuyos in the store)
  // dropping it into a gap left by a clear; the active piece's own descent
  // only ever moves userPuyoIds, which this skips entirely. Gives each
  // newly-collapsing id a small delay, staggered by column (see
  // COLLAPSE_STAGGER_SECONDS) and, within a column, by rank among that
  // column's other newly-collapsing balls (see COLLAPSE_ROW_STAGGER_SECONDS)
  // — before its spring starts chasing the new position, read in useFrame
  // below, which freezes a delayed id at its old position until its delay
  // runs out.
  React.useLayoutEffect(() => {
    const [userId1, userId2] = userPuyoIds;
    const newlyCollapsingByColumn = new Map<
      number,
      { id: string; row: number }[]
    >();

    Object.keys(puyos).forEach((id) => {
      if (id === userId1 || id === userId2) {
        return;
      }

      const [column, row] = getPuyoPosition(grid, id);

      if (column === null || row === null) {
        previousRowsRef.current.delete(id);
        return;
      }

      const previousRow = previousRowsRef.current.get(id);

      if (previousRow !== undefined && row > previousRow) {
        const columnIds = newlyCollapsingByColumn.get(column) ?? [];
        columnIds.push({ id, row });
        newlyCollapsingByColumn.set(column, columnIds);
      }

      previousRowsRef.current.set(id, row);
    });

    newlyCollapsingByColumn.forEach((columnIds, column) => {
      columnIds
        .slice()
        .sort((a, b) => b.row - a.row)
        .forEach(({ id }, rankInColumn) => {
          collapseDelayRef.current.set(
            id,
            column * COLLAPSE_STAGGER_SECONDS +
              rankInColumn * COLLAPSE_ROW_STAGGER_SECONDS,
          );
        });
    });
  }, [grid, puyos, userPuyoIds]);

  // Rotation-arc detection — identical to PuyoMetaballs (see that file for
  // the fuller rationale): detects "one puyo stayed put, the other stepped
  // to a neighbouring cell" as a pivot rotation, so it can be interpolated
  // along the arc instead of cutting straight across the corner.
  React.useEffect(() => {
    const [userId1, userId2] = userPuyoIds;
    const [col1, row1] = getPuyoPosition(grid, userId1);
    const [col2, row2] = getPuyoPosition(grid, userId2);
    const prevCell1 = previousUserCellsRef.current.get(userId1);
    const prevCell2 = previousUserCellsRef.current.get(userId2);

    if (
      col1 !== null &&
      row1 !== null &&
      col2 !== null &&
      row2 !== null &&
      prevCell1 &&
      prevCell2
    ) {
      const cell1Unchanged = prevCell1[0] === col1 && prevCell1[1] === row1;
      const cell2Unchanged = prevCell2[0] === col2 && prevCell2[1] === row2;

      if (cell1Unchanged !== cell2Unchanged) {
        const pivotCol = cell1Unchanged ? col1 : col2;
        const pivotRow = cell1Unchanged ? row1 : row2;
        const pivotId = cell1Unchanged ? userId1 : userId2;
        const orbiterId = cell1Unchanged ? userId2 : userId1;
        const prevOrbiterCell = cell1Unchanged ? prevCell2 : prevCell1;
        const newOrbiterCol = cell1Unchanged ? col2 : col1;
        const newOrbiterRow = cell1Unchanged ? row2 : row1;

        const oldColDelta = prevOrbiterCell[0] - pivotCol;
        const oldRowDelta = prevOrbiterCell[1] - pivotRow;
        const newColDelta = newOrbiterCol - pivotCol;
        const newRowDelta = newOrbiterRow - pivotRow;

        const isOrthogonalStep = (colDelta: number, rowDelta: number) =>
          Math.abs(colDelta) + Math.abs(rowDelta) === 1;

        if (
          isOrthogonalStep(oldColDelta, oldRowDelta) &&
          isOrthogonalStep(newColDelta, newRowDelta) &&
          (oldColDelta !== newColDelta || oldRowDelta !== newRowDelta)
        ) {
          const angleOf = (colDelta: number, rowDelta: number) =>
            Math.atan2(-rowDelta, colDelta);

          const pivotPos = positionsRef.current.get(pivotId);
          const orbiterPos = positionsRef.current.get(orbiterId);
          const startAngle =
            pivotPos && orbiterPos
              ? Math.atan2(
                  orbiterPos[1] - pivotPos[1],
                  orbiterPos[0] - pivotPos[0],
                )
              : angleOf(oldColDelta, oldRowDelta);

          const rawTargetAngle = angleOf(newColDelta, newRowDelta);

          rotationArcRef.current = {
            pivotId,
            orbiterId,
            startAngle,
            targetAngle:
              startAngle + normalizeAngleDelta(rawTargetAngle - startAngle),
            elapsed: 0,
          };
        }
      }
    }

    if (col1 !== null && row1 !== null) {
      previousUserCellsRef.current.set(userId1, [col1, row1]);
    }
    if (col2 !== null && row2 !== null) {
      previousUserCellsRef.current.set(userId2, [col2, row2]);
    }
  }, [grid, userPuyoIds]);

  useFrame((_, delta) => {
    const material = materialRef.current;

    if (!material || !cellSize) {
      return;
    }

    const dt = Math.min(delta, SPRING_MAX_DELTA_SECONDS);
    const springStiffness = SPRING_ANGULAR_FREQUENCY * SPRING_ANGULAR_FREQUENCY;
    const springDamping = 2 * SPRING_DAMPING_RATIO * SPRING_ANGULAR_FREQUENCY;
    const springDampingCollapseBounce =
      2 * SPRING_DAMPING_RATIO_COLLAPSE_BOUNCE * SPRING_ANGULAR_FREQUENCY;
    const positions = positionsRef.current;
    const velocities = velocitiesRef.current;
    const ballPositions = ballPositionsRef.current;
    const ballColours = ballColoursRef.current;
    const ballRadiusScales = ballRadiusScalesRef.current;

    let count = 0;

    for (const id of visibleIds) {
      if (count >= MAX_BALLS) {
        break;
      }

      const [column, row] = getPuyoPosition(grid, id);

      if (column === null || row === null) {
        continue;
      }

      const newRow = row - 2;
      // The ball's *actual* target grid position — kept separate from
      // targetX/targetY below (which the collapse freeze may override)
      // since the bounce settle-check further down needs the real target,
      // not wherever it's being held during its stagger delay.
      const realTargetX = column * cellSize - cellSize * 2.5;
      const realTargetY = (newRow * cellSize - cellSize * 5.5) * -1;

      let targetX = realTargetX;
      let targetY = realTargetY;

      // Still waiting out its collapse stagger — hold at the last position
      // instead of chasing the fresh (already-collapsed) grid target, so
      // the spring only starts moving once the delay runs out.
      const collapseDelay = collapseDelayRef.current.get(id);

      if (collapseDelay !== undefined) {
        const remaining = collapseDelay - delta;

        if (remaining > 0) {
          collapseDelayRef.current.set(id, remaining);

          const frozen = positions.get(id);

          if (frozen) {
            targetX = frozen[0];
            targetY = frozen[1];
          }
        } else {
          collapseDelayRef.current.delete(id);
          // Released — let it fall the rest of the way with a small
          // bounce (see SPRING_DAMPING_RATIO_COLLAPSE_BOUNCE) instead of
          // the usual critically-damped stop.
          collapseBouncingRef.current.add(id);
        }
      }

      const isCollapseBouncing = collapseBouncingRef.current.has(id);

      let x: number;
      let y: number;

      const arc = rotationArcRef.current;

      if (arc && arc.orbiterId === id && positions.get(arc.pivotId)) {
        const pivotPos = positions.get(arc.pivotId) as [number, number];

        arc.elapsed += delta;

        const progress = Math.min(
          1,
          arc.elapsed / ROTATION_ARC_DURATION_SECONDS,
        );
        const eased = smoothstep(progress);
        const angle =
          arc.startAngle + (arc.targetAngle - arc.startAngle) * eased;

        x = pivotPos[0] + Math.cos(angle) * cellSize;
        y = pivotPos[1] + Math.sin(angle) * cellSize;

        positions.set(id, [x, y]);
        velocities.set(id, [0, 0]);

        if (progress >= 1) {
          rotationArcRef.current = null;
        }
      } else {
        // A brand-new id (no prior position at all — its very first visible
        // frame) starts one row above its target instead of flush with it.
        // Otherwise a newly-visible orbiter can pop in exactly where its
        // pivot — one tick further along, still easing down from *its* own
        // previous row — happens to still be sitting, coinciding for a few
        // frames before the pivot's spring catches up and they separate.
        // Invisible for a same-coloured pair (reads as a merge), but a
        // jarring full overlap for different colours. Starting a row up
        // gives it the same falling-in continuity every other ball already
        // has, so it arrives already offset rather than overlapping first.
        const previous = positions.get(id) ?? [targetX, targetY + cellSize];
        const velocity = velocities.get(id) ?? [0, 0];
        const damping = isCollapseBouncing
          ? springDampingCollapseBounce
          : springDamping;

        const vx =
          velocity[0] +
          ((targetX - previous[0]) * springStiffness - velocity[0] * damping) *
            dt;
        const vy =
          velocity[1] +
          ((targetY - previous[1]) * springStiffness - velocity[1] * damping) *
            dt;

        x = previous[0] + vx * dt;
        y = previous[1] + vy * dt;

        positions.set(id, [x, y]);
        velocities.set(id, [vx, vy]);

        // Bounce's overshoot has settled (close to its real target, barely
        // moving) — revert to the plain critically-damped spring so it
        // doesn't linger underdamped indefinitely once actually at rest.
        if (isCollapseBouncing) {
          const settleDistance = cellSize * 0.02;
          const settleSpeed = cellSize * 0.5;
          const dx = realTargetX - x;
          const dy = realTargetY - y;

          if (
            dx * dx + dy * dy < settleDistance * settleDistance &&
            vx * vx + vy * vy < settleSpeed * settleSpeed
          ) {
            collapseBouncingRef.current.delete(id);
          }
        }
      }

      ballPositions[count].set(x, y);
      ballColours[count] = COLOUR_INDEX[puyos[id].colour];
      ballRadiusScales[count] = 1;
      count += 1;
    }

    // Cleared clusters shrink away in place, staggered so a multi-ball
    // group pops one after another instead of all at once — matching
    // SinkingMetaballBlob in PuyoMetaballs, just folded into this same
    // shader's ball list instead of a separate mesh.
    const stillExiting: ExitingGroup[] = [];

    for (const group of exitingGroupsRef.current) {
      group.elapsed += delta;

      let anyAlive = false;

      group.positions.forEach(([x, y], index) => {
        const ownElapsed = Math.max(0, group.elapsed - index * STAGGER_SECONDS);
        const ownProgress = Math.min(1, ownElapsed / SINK_DURATION_SECONDS);

        if (ownProgress < 1) {
          anyAlive = true;
        }

        const shrink = 1 - easeInCubic(ownProgress);

        if (count >= MAX_BALLS || shrink <= 0.001) {
          return;
        }

        ballPositions[count].set(x, y);
        ballColours[count] = group.colourIndex;
        ballRadiusScales[count] = shrink;
        count += 1;
      });

      if (anyAlive) {
        stillExiting.push(group);
      }
    }

    exitingGroupsRef.current = stillExiting;

    const liveIds = new Set(visibleIds);

    positions.forEach((_, id) => {
      if (!liveIds.has(id)) {
        positions.delete(id);
      }
    });

    velocities.forEach((_, id) => {
      if (!liveIds.has(id)) {
        velocities.delete(id);
      }
    });

    collapseDelayRef.current.forEach((_, id) => {
      if (!liveIds.has(id)) {
        collapseDelayRef.current.delete(id);
      }
    });

    collapseBouncingRef.current.forEach((id) => {
      if (!liveIds.has(id)) {
        collapseBouncingRef.current.delete(id);
      }
    });

    const ballRadius = TARGET_RADIUS_RATIO * cellSize;

    material.uBallCount = count;
    material.uBallBaseRadius = ballRadius;
    material.uSmoothK = ballRadius * SMOOTH_MIN_RATIO;
    material.uMarchRange = ballRadius * 1.5;
    material.uBallPos = ballPositions;
    material.uBallColour = ballColours;
    material.uBallRadiusScale = ballRadiusScales;

    const lightPos = lightPosRef.current;
    lightPos.set(
      LIGHT_POS_CELLS[0] * cellSize,
      LIGHT_POS_CELLS[1] * cellSize,
      LIGHT_POS_CELLS[2] * cellSize,
    );
    material.uLightPos = lightPos;

    const fillLightPos = fillLightPosRef.current;
    fillLightPos.set(
      FILL_LIGHT_POS_CELLS[0] * cellSize,
      FILL_LIGHT_POS_CELLS[1] * cellSize,
      FILL_LIGHT_POS_CELLS[2] * cellSize,
    );
    material.uFillLightPos = fillLightPos;

    // Reassigned every frame (not just at construction) so tweaking these
    // constants takes effect on save — see the uniform declarations in the
    // fragment shader above for why they're uniforms rather than #defines.
    material.uAmbientIntensity = AMBIENT_INTENSITY;
    material.uKeyDiffuseIntensity = KEY_DIFFUSE_INTENSITY;
    material.uFillDiffuseIntensity = FILL_DIFFUSE_INTENSITY;
    material.uKeySpecularIntensity = KEY_SPECULAR_INTENSITY;
    material.uFillSpecularIntensity = FILL_SPECULAR_INTENSITY;
    material.uSpecularShininess = SPECULAR_SHININESS;
    material.uFresnelIntensity = FRESNEL_INTENSITY;
    material.uFresnelPower = FRESNEL_POWER;
  });

  if (!cellSize) {
    return null;
  }

  return (
    // Nudged slightly toward the camera so it wins the depth test against
    // the (exactly coplanar) board grid lines — this shader doesn't write
    // gl_FragDepth, so without this the flat quad's own depth (not the
    // raymarched hit depth) would z-fight with them.
    <mesh position={[0, 0, cellSize * 0.01]}>
      <planeGeometry args={[cellSize * 7, cellSize * 13]} />
      <raymarchPuyoMaterial ref={materialRef} />
    </mesh>
  );
};

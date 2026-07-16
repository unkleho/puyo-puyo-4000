import { extend, useFrame } from '@react-three/fiber';
import React from 'react';
import { MarchingCubes as MarchingCubesImpl } from 'three/examples/jsm/objects/MarchingCubes';
import { Grid, Puyos, PuyoColour } from '../store/store';
import { getPuyoGroups, getPuyoPosition, PuyoGroup } from '../shared/grid';

extend({ MarchingCubes: MarchingCubesImpl });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      marchingCubes: any;
    }
  }
}

const colours = {
  [PuyoColour.BLUE]: '#2563EB',
  [PuyoColour.RED]: '#DC2626',
  [PuyoColour.YELLOW]: '#CA8A04',
  [PuyoColour.GREEN]: '#15803D',
  [PuyoColour.PURPLE]: '#9333EA',
};

// ---------------------------------------------------------------------------
// Tuning constants — everything worth adjusting to change how this looks or
// performs lives here.
// ---------------------------------------------------------------------------

// How long a user-piece rotation's 90° sweep around its pivot takes.
const ROTATION_ARC_DURATION_SECONDS = 0.2;

// Position smoothing: a damped spring rather than a plain ease-out lerp
// Main speed dial for the spring
const SPRING_ANGULAR_FREQUENCY = 15; // rad/s
// Critically damped (no overshoot). A bouncy (underdamped) ratio was tried
// for the falling piece to sell a "landing" feel, but any overshoot on a
// ball's own rendered position directly threatens metaball connectivity: it
// oscillates the exact distance that determines whether it visually merges
// with a same-coloured neighbour, causing flicker whenever the falling piece
// passes close to one. Removed rather than tuned further — there's no
// oscillation left to cause that flicker. The "starts slow, speeds up like
// gravity" feel still comes through since a puyo always starts this spring
// from rest.
const SPRING_DAMPING_RATIO = 1;
// Clamp the timestep fed to the spring integrator — an uncapped delta after
// a frame hitch can make an explicit spring integration overshoot wildly
// instead of just bouncing.
const SPRING_MAX_DELTA_SECONDS = 1 / 30;

// Margin (in cells) added around a group's bounding box so blobs have room
// to bulge without hitting the field's edge.
const MARGIN_CELLS = 1.2;
// Isosurface threshold — the field value blobs are drawn at.
const ISOLATION = 70;
// Falloff steepness. Lower = balls merge more eagerly across gaps.
// Grid-adjacent puyos' surfaces are only ~0.14 cells apart, so the "neck"
// bridging them is thin relative to the voxel grid — a classic marching
// cubes aliasing spot where a too-steep falloff makes that neck flicker in
// and out as positions/resolution shift by even a fraction of a voxel.
// Lowering this widens the blend zone (more voxels span the transition,
// without changing any solo ball's own isosurface radius — see
// computeStrength) so the connection resolves more stably.
const SUBTRACT = 8;
// Steeper (higher) falloff used only for the sink-away (clear) animation —
// see where it's used below for why. Higher than the live SUBTRACT (and
// higher than the original pre-merge-fix value of 20): the disconnect
// between two still-blended, differently-sized balls is an unavoidable
// one-frame topology change, but its visual size depends on how thick the
// connecting neck was a frame earlier. A steeper falloff keeps that neck
// thinner throughout the blended phase, so the jump when it vanishes is
// smaller, not just faster.
const SINK_SUBTRACT = 40;
// A group is fully grid-adjacent (hence connected) right up until it clears,
// rendered live at SUBTRACT. Switching straight to SINK_SUBTRACT the instant
// the sink animation mounts — before any ball has even started shrinking —
// visibly snaps the neck from "eagerly merged" to "steep" in one frame. Ramp
// between the two instead, over this short a window at the very start of the
// sink lifetime (well before real shrinking kicks in — see easeInCubic).
// Both endpoints keep the still-full-size group connected (just with a
// different neck thickness), so this never crosses the connect/disconnect
// threshold the way animating through a merge would.
const SINK_SUBTRACT_RAMP_DURATION_SECONDS = 0.5;
// Fraction of cellSize an isolated ball's radius should end up as, matching
// PuyoSphere's old radius (cellSize / 2 * 0.9).
const TARGET_RADIUS_RATIO = 0.43;

// Resolution/triangle budget scale with a group's actual span — its
// bounding box, in cells — not its member count (a solo ball vs. a 2x2
// cluster need different detail for the same count). Proximity-based
// grouping (see groupByProximity) mostly keeps a group's span small, but a
// long chain of near-neighbours can still connect transitively into
// something board-spanning — this cap is deliberately conservative (48, not
// the ~96+ true solo-ball parity would need for a board-spanning field) to
// keep that (rare) case affordable; it'll look softer than a tight cluster,
// not literally broken like an unrounded/oversized resolution previously
// caused.
//
// The step is derived, not guessed: fieldScale grows by cellSize/2 per cell
// of span (see computeFieldLayout), so to hold voxel density constant
// (matching a solo ball's quality), resolution has to grow by the same
// fraction — base/(2*MARGIN_CELLS) per cell. A flatter step under-resolves
// anything wider than a tight cluster (this is what made whole-colour
// grouping, tried and reverted, look blocky).
const RESOLUTION_BASE = 28; // resolution at 0 cells of span (a solo ball)
const RESOLUTION_STEP_PER_CELL = RESOLUTION_BASE / (2 * MARGIN_CELLS);
const RESOLUTION_CAP = 48;

function getResolution(spanCells: number) {
  // Must be an integer: MarchingCubesImpl uses this directly as `this.size`
  // for all its index math (size2 = size*size, offsets, loop bounds), while
  // its typed arrays get integer-truncated lengths from it — a fractional
  // resolution desyncs that math from the actual buffer sizes, silently
  // breaking the generated geometry (this is why merged/multi-ball groups,
  // span > 0, went invisible while solo balls, always exactly
  // RESOLUTION_BASE, kept working).
  return Math.round(
    Math.min(
      RESOLUTION_CAP,
      RESOLUTION_BASE + spanCells * RESOLUTION_STEP_PER_CELL,
    ),
  );
}

// Derived from resolution, not scaled independently: for a fixed set of
// ball shapes, triangle count tracks the surface's tessellation density
// squared (a 2D manifold), not resolution cubed like the field-fill cost.
const MAX_POLY_COUNT_BASE = 1000; // triangle budget at RESOLUTION_BASE

function getMaxPolyCount(spanCells: number) {
  const resolution = getResolution(spanCells);

  return Math.round(
    MAX_POLY_COUNT_BASE * Math.pow(resolution / RESOLUTION_BASE, 2),
  );
}

// The bounding box (in grid cells) spanned by a group's members — see
// getResolution/getMaxPolyCount above for why this replaced member count.
function getGroupSpanCells(grid: Grid, ids: string[]): number {
  const positions = ids
    .map((id) => getPuyoPosition(grid, id))
    .filter(
      (position): position is [number, number] =>
        position[0] !== null && position[1] !== null,
    );

  if (positions.length === 0) {
    return 0;
  }

  const columns = positions.map(([column]) => column);
  const rows = positions.map(([, row]) => row);

  return Math.max(
    Math.max(...columns) - Math.min(...columns),
    Math.max(...rows) - Math.min(...rows),
  );
}

// Sinking (clear) animation
const SINK_DURATION_SECONDS = 0.35;
// How far the group drifts down as its balls shrink away.
const SINK_DISTANCE_CELLS = 0;
// Delay before each successive ball starts shrinking, so a multi-ball group
// pops away one after another instead of all at once.
const STAGGER_SECONDS = 0.05;

// How long a group of this size takes to finish sinking away — the last
// ball's shrink starts (size - 1) * STAGGER_SECONDS in (see
// SinkingMetaballBlob), so the group's total lifetime stretches by that much
// past a single ball's own SINK_DURATION_SECONDS. Exported so the game state
// machine (Game.tsx) can wait for this exact duration before dropping other
// puyos into the gap, instead of a separately hand-tuned timeout that has to
// be kept in sync by hand (which is exactly how this got out of sync before).
export function getSinkAnimationDurationSeconds(groupSize: number) {
  return SINK_DURATION_SECONDS + (groupSize - 1) * STAGGER_SECONDS;
}

// ---------------------------------------------------------------------------

type Props = {
  grid: Grid;
  puyos: Puyos;
  cellSize: number;
  userPuyoIds: [string, string];
};

// Position smoothing lives here (not inside each blob) so a puyo's world
// position stays continuous across a merge/split, instead of resetting
// whenever it moves between an own-blob and a shared-cluster blob.
type PositionMap = Map<string, [number, number]>;
// Paired with PositionMap — a puyo's current world-space velocity, so its
// spring toward the target (see SPRING_ANGULAR_FREQUENCY) can carry momentum
// across a merge/split the same way its position already does.
type VelocityMap = Map<string, [number, number]>;

type Group = {
  // Stable across renders as long as any one member survives — see
  // groupByProximity below for why this matters for React's key prop.
  key: string;
  colour: PuyoColour;
  ids: string[];
};

type ExitingGroup = {
  key: string;
  colour: PuyoColour;
  positions: [number, number][];
};

// When the user rotates their piece, the orbiting puyo steps 90° around the
// fixed one. Rather than let position-smoothing lerp straight across that
// corner, this tracks an in-flight sweep so it can be interpolated along the
// arc instead — reads as an actual rotation rather than a diagonal cut.
type RotationArc = {
  pivotId: string;
  orbiterId: string;
  startAngle: number;
  // Continuous (unwrapped) target angle — already startAngle + the shortest
  // signed delta, so a plain lerp between the two can't take the long way
  // round past the ±180° seam.
  targetAngle: number;
  elapsed: number;
};

type BlobProps = {
  colour: PuyoColour;
  ids: string[];
  grid: Grid;
  cellSize: number;
  positionsRef: React.MutableRefObject<PositionMap>;
  velocitiesRef: React.MutableRefObject<VelocityMap>;
  rotationArcRef: React.MutableRefObject<RotationArc | null>;
};

type SinkingBlobProps = {
  colour: PuyoColour;
  // Frozen at the moment the group cleared — its ids are gone from the grid
  // by then, so there's nothing left to read live positions from.
  positions: [number, number][];
  cellSize: number;
  onComplete: () => void;
};

function normalizeAngleDelta(delta: number) {
  const twoPi = Math.PI * 2;
  return ((((delta + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI;
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

// Unlike smoothstep, this keeps accelerating right up to t=1 instead of
// flattening out — used for the sink shrink below so a ball doesn't linger
// at any one intermediate size for many consecutive frames. Two different
// sizes matter here: near the very end, a near-zero (sub-voxel) size that
// marching cubes can't resolve cleanly; and, well before that, whatever size
// a shrinking ball happens to be at when it disconnects from a still-larger
// neighbour (a real, unavoidable one-frame topology change — see
// SinkingMetaballBlob). Cubic (rather than quadratic) reaches any given
// intermediate size with a steeper local slope, so both moments are crossed
// in fewer frames — less linger, less visible either way.
function easeInCubic(t: number) {
  return t * t * t;
}

// strength ∝ radius², so scaling radiusRatio down shrinks each ball's own
// isosurface radius (used to shrink balls individually on clear, vs. scaling
// the whole mesh).
function computeStrength(
  fieldScale: number,
  cellSize: number,
  radiusRatio: number = TARGET_RADIUS_RATIO,
  subtract: number = SUBTRACT,
) {
  const targetRadius = radiusRatio * cellSize;

  return Math.pow(targetRadius / (2 * fieldScale), 2) * (ISOLATION + subtract);
}

function computeFieldLayout(positions: [number, number][], cellSize: number) {
  const xs = positions.map(([x]) => x);
  const ys = positions.map(([, y]) => y);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
  const halfSpan =
    Math.max(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys),
    ) / 2;
  const fieldScale = halfSpan + cellSize * MARGIN_CELLS;

  // Keep an isolated ball's radius constant regardless of the group's
  // (dynamic) field size.
  const strength = computeStrength(fieldScale, cellSize);

  // Every puyo sits at the same depth (addBall's ballZ is always 0.5) — the
  // mesh's Z-extent never actually needs to grow with the group's XY span
  // the way fieldScale does. Scaling Z uniformly with fieldScale anyway
  // wastes voxel density on empty depth for any group wider than a solo
  // ball, and MarchingCubes's own triangulation pass skips its outermost
  // layer asymmetrically per axis (1 layer at one end, 2 at the other —
  // see the onBeforeRender loop bounds), which becomes visible as a
  // lopsided "chopped" clip once a ball's own extent is only a few voxels
  // wide relative to the field. Keeping depth fixed at a solo ball's own
  // fieldScale keeps it comfortably resolved regardless of how wide the
  // group is.
  const depthScale = cellSize * MARGIN_CELLS;

  return { centerX, centerY, fieldScale, depthScale, strength };
}

// How close (in grid cells, Chebyshev distance) two same-coloured puyos
// have to be to share a field. 1 would mean "only actual grid neighbours" —
// the original adjacency grouping, which only merged right at the moment of
// landing. Going slightly wider than that lets a falling piece visually
// start blending into a same-coloured neighbour a little before it's
// literally touching (the "allow merging while passing" behaviour), instead
// of a merge that only ever appears once contact is exact.
const PROXIMITY_THRESHOLD_CELLS = 2;

// Clusters same-coloured puyos that are within PROXIMITY_THRESHOLD_CELLS of
// each other (transitively — a chain of near neighbours joins into one
// group even if its ends are far apart), rather than either strict grid
// adjacency or the whole colour at once. Both of those were tried and
// reverted:
// - Strict adjacency (distance 1) only ever grouped right at the moment of
//   landing, which read as a sudden merge rather than the pieces "passing"
//   into each other.
// - Whole-colour grouping had no discrete join/split at all, but every
//   member shared one field spanning the colour's entire bounding box — any
//   single member moving (eg. the falling piece) reshaped/rescaled that
//   field for every other member, even ones sitting still elsewhere on the
//   board.
// Bounding group membership to actual proximity keeps each field's span
// (and thus its resize-on-movement blast radius) local to genuinely nearby
// balls. This does reintroduce discrete group changes when two clusters
// merge — previously the source of visible flicker — but that was likely
// compounded by two bugs since fixed: fractional marching-cubes resolution
// (see getResolution) and the falling piece's own bounce oscillating its
// distance to neighbours (both fixed since the last time this was tried).
// Each returned group's key is its lowest surviving id (see Group) so a
// cluster that gains a member via merging keeps the same React key/mesh
// instance instead of remounting — only the absorbed cluster's own
// (now-redundant) mesh unmounts.
function groupByProximity(grid: Grid, puyos: Puyos): Group[] {
  const idsByColour = new Map<PuyoColour, string[]>();
  const positionById = new Map<string, [number, number]>();

  Object.keys(puyos).forEach((puyoId) => {
    const [column, row] = getPuyoPosition(grid, puyoId);

    if (column === null || row === null) {
      return;
    }

    positionById.set(puyoId, [column, row]);

    const colour = puyos[puyoId].colour;
    const ids = idsByColour.get(colour) ?? [];
    ids.push(puyoId);
    idsByColour.set(colour, ids);
  });

  const groups: Group[] = [];

  idsByColour.forEach((ids, colour) => {
    // Union-find over this colour's ids, connecting any pair within the
    // proximity threshold.
    const parent = new Map<string, string>(ids.map((id) => [id, id]));

    const find = (id: string): string => {
      let root = id;

      while (parent.get(root) !== root) {
        root = parent.get(root) as string;
      }

      let current = id;

      while (parent.get(current) !== root) {
        const next = parent.get(current) as string;
        parent.set(current, root);
        current = next;
      }

      return root;
    };

    const union = (a: string, b: string) => {
      const rootA = find(a);
      const rootB = find(b);

      if (rootA !== rootB) {
        parent.set(rootA, rootB);
      }
    };

    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const [column1, row1] = positionById.get(ids[i]) as [number, number];
        const [column2, row2] = positionById.get(ids[j]) as [number, number];
        const distance = Math.max(
          Math.abs(column1 - column2),
          Math.abs(row1 - row2),
        );

        if (distance <= PROXIMITY_THRESHOLD_CELLS) {
          union(ids[i], ids[j]);
        }
      }
    }

    const idsByRoot = new Map<string, string[]>();

    ids.forEach((id) => {
      const root = find(id);
      const clusterIds = idsByRoot.get(root) ?? [];
      clusterIds.push(id);
      idsByRoot.set(root, clusterIds);
    });

    idsByRoot.forEach((clusterIds) => {
      groups.push({
        key: clusterIds.slice().sort()[0],
        colour,
        ids: clusterIds,
      });
    });
  });

  return groups;
}

/**
 * Renders same-coloured puyos as merging metaball blobs (marching cubes).
 * Every puyo — solo or clustered — renders the same way (one field per
 * colour, sized to that colour's current bounding box), so there's no
 * visual pop from switching rendering techniques. Groups are proximity-based
 * (see groupByProximity above), so nearby same-coloured puyos share one
 * field and everything else renders independently. Field resolution/triangle
 * budget scale with group size, since a lone ball needs far less detail
 * than an actual merge, which keeps the common (mostly unmerged) case cheap.
 */
export const PuyoMetaballs: React.FC<Props> = ({
  grid,
  puyos,
  cellSize,
  userPuyoIds,
}) => {
  const positionsRef = React.useRef<PositionMap>(new Map());
  const velocitiesRef = React.useRef<VelocityMap>(new Map());
  const previousClusterGroupsRef = React.useRef<PuyoGroup[]>([]);
  const exitKeyRef = React.useRef(0);
  const [exitingGroups, setExitingGroups] = React.useState<ExitingGroup[]>([]);

  // Grid cell (not pixel) of each user puyo last time we checked, so a
  // rotation can be detected as "one stayed put, the other stepped to a
  // different neighbouring cell" — independent of which blob(s) they render
  // through.
  const previousUserCellsRef = React.useRef<Map<string, [number, number]>>(
    new Map(),
  );
  const rotationArcRef = React.useRef<RotationArc | null>(null);

  // Hide top two rows for new puyos, same as the old ThreeBoard rendering.
  // Generic so it works for both the (keyed) render groups and the
  // (unkeyed) cluster groups below.
  const hideQueuedIds = React.useCallback(
    <T extends { ids: string[] }>(rawGroups: T[]): T[] =>
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

  // What's actually rendered as merging blobs — see groupByProximity above.
  const groups = React.useMemo(
    () => hideQueuedIds(groupByProximity(grid, puyos)),
    [grid, puyos, hideQueuedIds],
  );

  // A *connected* (strictly grid-adjacent) grouping, separate from the
  // proximity-based render groups above — only used to detect a specific
  // cluster clearing (below), which must match the game's actual
  // connected-4 clear logic exactly. The render groups' looser proximity
  // threshold can bundle together (or split apart) puyos differently than
  // the strict adjacency the clear logic uses, so they can't stand in for
  // this.
  const clusterGroups = React.useMemo(
    () => hideQueuedIds(getPuyoGroups(grid, puyos)),
    [grid, puyos, hideQueuedIds],
  );

  // useLayoutEffect (not useEffect): this reacts to a cluster vanishing from
  // `clusterGroups` by swapping in its sink-away replacement. useEffect fires
  // after the browser has already painted the frame where the group's mesh
  // was removed — with R3F's render loop repainting every animation frame
  // regardless of React's own commit timing, that gap was enough for the
  // group to visibly vanish for a frame (or more) before reappearing to sink
  // away. useLayoutEffect's setState is flushed synchronously before paint,
  // so the removal and its sink-away replacement land in the same frame.
  React.useLayoutEffect(() => {
    // A cluster that just cleared disappears from the grid entirely, all at
    // once — spot that so it can sink away instead of popping out of
    // existence. (Can't key this off `puyos` — the store never deletes
    // cleared ids from it, only nulls their grid cells.) Uses clusterGroups
    // (connected, not colour-wide) — see clusterGroups above for why.
    const newlyCleared = previousClusterGroupsRef.current.filter((group) =>
      group.ids.every((id) => {
        const [column, row] = getPuyoPosition(grid, id);
        return column === null || row === null;
      }),
    );

    if (newlyCleared.length > 0) {
      setExitingGroups((current) => [
        ...current,
        ...newlyCleared.map((group) => {
          exitKeyRef.current += 1;

          return {
            key: `exit-${exitKeyRef.current}`,
            colour: group.colour,
            positions: group.ids.map(
              (id) => positionsRef.current.get(id) ?? [0, 0],
            ) as [number, number][],
          };
        }),
      ]);
    }

    const liveIds = new Set(groups.flatMap((group) => group.ids));

    positionsRef.current.forEach((_, id) => {
      if (!liveIds.has(id)) {
        positionsRef.current.delete(id);
      }
    });

    velocitiesRef.current.forEach((_, id) => {
      if (!liveIds.has(id)) {
        velocitiesRef.current.delete(id);
      }
    });

    previousClusterGroupsRef.current = clusterGroups;
  }, [groups, clusterGroups, grid]);

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

      // Exactly one puyo staying put while the other steps to a neighbouring
      // cell is what a pivot rotation looks like. (Wall-kick shifts/flips
      // move both, or neither — those fall back to the normal straight lerp.)
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
          // Row increases downward but world Y is inverted, hence -rowDelta.
          const angleOf = (colDelta: number, rowDelta: number) =>
            Math.atan2(-rowDelta, colDelta);

          // Start from wherever the orbiter is actually rendered right now
          // (not its old grid cell) so a second rotation fired mid-arc
          // continues smoothly instead of jumping back to the previous step.
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

  if (!cellSize) {
    return null;
  }

  return (
    <>
      {groups.map((group) => (
        <MetaballBlob
          // See Group/groupByProximity above: a cluster's key is its lowest
          // member id, so it survives a merge (only the absorbed cluster's
          // own component unmounts).
          key={group.key}
          colour={group.colour}
          ids={group.ids}
          grid={grid}
          cellSize={cellSize}
          positionsRef={positionsRef}
          velocitiesRef={velocitiesRef}
          rotationArcRef={rotationArcRef}
        />
      ))}

      {exitingGroups.map((group) => (
        <SinkingMetaballBlob
          key={group.key}
          colour={group.colour}
          positions={group.positions}
          cellSize={cellSize}
          onComplete={() => {
            setExitingGroups((current) =>
              current.filter((g) => g.key !== group.key),
            );
          }}
        />
      ))}
    </>
  );
};

const MetaballBlob: React.FC<BlobProps> = ({
  colour,
  ids,
  grid,
  cellSize,
  positionsRef,
  velocitiesRef,
  rotationArcRef,
}) => {
  const effectRef = React.useRef<any>(null);

  useFrame((_, delta) => {
    const effect = effectRef.current;

    if (!effect || !cellSize) {
      return;
    }

    const dt = Math.min(delta, SPRING_MAX_DELTA_SECONDS);
    const springStiffness = SPRING_ANGULAR_FREQUENCY * SPRING_ANGULAR_FREQUENCY;
    const springDamping = 2 * SPRING_DAMPING_RATIO * SPRING_ANGULAR_FREQUENCY;
    const positions = positionsRef.current;
    const velocities = velocitiesRef.current;

    const worldPositions = ids
      .map((id) => {
        const [column, row] = getPuyoPosition(grid, id);

        if (column === null || row === null) {
          return null;
        }

        const newRow = row - 2;
        const targetX = column * cellSize - cellSize * 2.5;
        const targetY = (newRow * cellSize - cellSize * 5.5) * -1;

        const arc = rotationArcRef.current;

        if (arc && arc.orbiterId === id) {
          const pivotPos = positions.get(arc.pivotId);

          if (pivotPos) {
            arc.elapsed += delta;

            const progress = Math.min(
              1,
              arc.elapsed / ROTATION_ARC_DURATION_SECONDS,
            );
            const eased = smoothstep(progress);
            const angle =
              arc.startAngle + (arc.targetAngle - arc.startAngle) * eased;

            const x = pivotPos[0] + Math.cos(angle) * cellSize;
            const y = pivotPos[1] + Math.sin(angle) * cellSize;

            const arcPosition: [number, number] = [x, y];

            positions.set(id, arcPosition);
            // Directly driven by the arc, not the spring — zero the
            // velocity so that once the arc finishes, the spring resumes
            // from rest instead of carrying over a stale velocity and
            // flicking off in some unrelated direction.
            velocities.set(id, [0, 0]);

            if (progress >= 1) {
              rotationArcRef.current = null;
            }

            return arcPosition;
          }
        }

        const previous = positions.get(id) ?? [targetX, targetY];
        const velocity = velocities.get(id) ?? [0, 0];

        const vx =
          velocity[0] +
          ((targetX - previous[0]) * springStiffness -
            velocity[0] * springDamping) *
            dt;
        const vy =
          velocity[1] +
          ((targetY - previous[1]) * springStiffness -
            velocity[1] * springDamping) *
            dt;

        const x = previous[0] + vx * dt;
        const y = previous[1] + vy * dt;

        positions.set(id, [x, y]);
        velocities.set(id, [vx, vy]);

        return [x, y] as [number, number];
      })
      .filter((position): position is [number, number] => position !== null);

    if (worldPositions.length === 0) {
      return;
    }

    const { centerX, centerY, fieldScale, depthScale, strength } =
      computeFieldLayout(worldPositions, cellSize);

    effect.position.set(centerX, centerY, 0);
    effect.scale.set(fieldScale, fieldScale, depthScale);

    effect.reset();

    worldPositions.forEach(([x, y]) => {
      const ballX = (x - centerX) / fieldScale / 2 + 0.5;
      const ballY = (y - centerY) / fieldScale / 2 + 0.5;

      effect.addBall(ballX, ballY, 0.5, strength, SUBTRACT);
    });

    // No explicit `.update()` in this three version — geometry is rebuilt
    // automatically in the mesh's onBeforeRender hook when the renderer draws it.
  });

  const spanCells = getGroupSpanCells(grid, ids);

  return (
    <marchingCubes
      ref={effectRef}
      args={[
        getResolution(spanCells),
        undefined,
        false,
        false,
        getMaxPolyCount(spanCells),
      ]}
      isolation={ISOLATION}
    >
      <meshStandardMaterial
        color={colours[colour]}
        roughness={0.1}
        metalness={0.1}
      />
    </marchingCubes>
  );
};

/**
 * Plays a cleared group drifting down while each of its balls shrinks away
 * individually, staggered so they don't all vanish in lockstep (rather than
 * the whole merged shape scaling down as one), then calls onComplete so the
 * parent can stop rendering it. The field's position/bounding layout is
 * frozen (computed once); only each ball's own strength (and so its radius)
 * shrinks over time.
 */
const SinkingMetaballBlob: React.FC<SinkingBlobProps> = ({
  colour,
  positions,
  cellSize,
  onComplete,
}) => {
  const effectRef = React.useRef<any>(null);
  const elapsedRef = React.useRef(0);
  const hasCompletedRef = React.useRef(false);

  const layout = React.useMemo(
    () => computeFieldLayout(positions, cellSize),
    [positions, cellSize],
  );
  const totalDuration = getSinkAnimationDurationSeconds(positions.length);
  // A cleared cluster is always tightly grid-adjacent, so this stays small.
  const spanCells = React.useMemo(() => {
    const xs = positions.map(([x]) => x);
    const ys = positions.map(([, y]) => y);

    return (
      Math.max(
        Math.max(...xs) - Math.min(...xs),
        Math.max(...ys) - Math.min(...ys),
      ) / cellSize
    );
  }, [positions, cellSize]);

  useFrame((_, delta) => {
    const effect = effectRef.current;

    if (!effect || hasCompletedRef.current) {
      return;
    }

    elapsedRef.current += delta;
    const overallProgress = Math.min(1, elapsedRef.current / totalDuration);
    const overallEased = smoothstep(overallProgress);

    // Group-level (not per-ball/staggered) ramp from the live SUBTRACT up to
    // SINK_SUBTRACT — see SINK_SUBTRACT_RAMP_DURATION_SECONDS above.
    const subtractRampProgress = Math.min(
      1,
      elapsedRef.current / SINK_SUBTRACT_RAMP_DURATION_SECONDS,
    );
    const currentSubtract =
      SUBTRACT + (SINK_SUBTRACT - SUBTRACT) * smoothstep(subtractRampProgress);

    const { centerX, centerY, fieldScale, depthScale } = layout;

    effect.position.set(
      centerX,
      centerY - overallEased * cellSize * SINK_DISTANCE_CELLS,
      0,
    );
    effect.scale.set(fieldScale, fieldScale, depthScale);

    effect.reset();

    positions.forEach(([x, y], index) => {
      const ownElapsed = Math.max(
        0,
        elapsedRef.current - index * STAGGER_SECONDS,
      );
      const ownProgress = Math.min(1, ownElapsed / SINK_DURATION_SECONDS);
      const shrink = 1 - easeInCubic(ownProgress);

      // Uses currentSubtract (ramping up to the steeper SINK_SUBTRACT) — with
      // several balls at very different sizes sharing one field during a
      // staggered shrink, a low subtract's wider reach makes it easy for two
      // balls' fields to constructively overlap somewhere that isn't near
      // either ball's centre and cross ISOLATION there too, rendering as a
      // stray fleck of extra geometry. A steeper falloff keeps each ball's
      // influence more tightly local, so that overlap is far less likely.
      const strength = computeStrength(
        fieldScale,
        cellSize,
        TARGET_RADIUS_RATIO * shrink,
        currentSubtract,
      );

      const ballX = (x - centerX) / fieldScale / 2 + 0.5;
      const ballY = (y - centerY) / fieldScale / 2 + 0.5;

      effect.addBall(ballX, ballY, 0.5, strength, currentSubtract);
    });

    if (overallProgress >= 1) {
      hasCompletedRef.current = true;
      onComplete();
    }
  });

  return (
    <marchingCubes
      ref={effectRef}
      args={[
        getResolution(spanCells),
        undefined,
        false,
        false,
        getMaxPolyCount(spanCells),
      ]}
      isolation={ISOLATION}
    >
      <meshStandardMaterial
        color={colours[colour]}
        roughness={0.1}
        metalness={0.1}
      />
    </marchingCubes>
  );
};

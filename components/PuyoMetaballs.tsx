import { extend, useFrame } from '@react-three/fiber';
import React from 'react';
import { MarchingCubes as MarchingCubesImpl } from 'three/examples/jsm/objects/MarchingCubes';
import { Grid, Puyos, PuyoColour } from '../store/store';
import { getPuyoGroups, getPuyoPosition } from '../shared/grid';

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

// Margin (in cells) added around a group's bounding box so blobs have room
// to bulge without hitting the field's edge.
const MARGIN_CELLS = 1.2;
// Isosurface threshold — the field value blobs are drawn at.
const ISOLATION = 70;
// Falloff steepness. Lower = balls merge more eagerly across gaps.
const SUBTRACT = 20;
// Fraction of cellSize an isolated ball's radius should end up as, matching
// PuyoSphere's old radius (cellSize / 2 * 0.9).
const TARGET_RADIUS_RATIO = 0.43;

// High quality — noticeably smoother, ~2x the cost of Balanced at a 4-merge
const RESOLUTION_BASE = 28; // resolution for a solo ball
const RESOLUTION_STEP_PER_PUYO = 6; // added per extra merged ball
const RESOLUTION_CAP = 44; // max resolution, at a 4-merge
const MAX_POLY_COUNT_BASE = 1000; // triangle budget for a solo ball
const MAX_POLY_COUNT_STEP_PER_PUYO = 2000; // added per extra merged ball
const MAX_POLY_COUNT_CAP = 7000; // max triangle budget, at a 4-merge

function getResolution(size: number) {
  return Math.min(
    RESOLUTION_CAP,
    RESOLUTION_BASE + (size - 1) * RESOLUTION_STEP_PER_PUYO,
  );
}
function getMaxPolyCount(size: number) {
  return Math.min(
    MAX_POLY_COUNT_CAP,
    MAX_POLY_COUNT_BASE + (size - 1) * MAX_POLY_COUNT_STEP_PER_PUYO,
  );
}

// Sinking (clear) animation
const SINK_DURATION_SECONDS = 0.6;
// How far the group drifts down as its balls shrink away.
const SINK_DISTANCE_CELLS = 0;
// Delay before each successive ball starts shrinking, so a multi-ball group
// pops away one after another instead of all at once.
const STAGGER_SECONDS = 0.05;

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

type Group = { colour: PuyoColour; ids: string[] };

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

// strength ∝ radius², so scaling radiusRatio down shrinks each ball's own
// isosurface radius (used to shrink balls individually on clear, vs. scaling
// the whole mesh).
function computeStrength(
  fieldScale: number,
  cellSize: number,
  radiusRatio: number = TARGET_RADIUS_RATIO,
) {
  const targetRadius = radiusRatio * cellSize;

  return Math.pow(targetRadius / (2 * fieldScale), 2) * (ISOLATION + SUBTRACT);
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

  return { centerX, centerY, fieldScale, strength };
}

/**
 * Renders same-coloured, grid-adjacent puyos as merging metaball blobs
 * (marching cubes). Every puyo — solo or clustered — renders the same way
 * (one small field per touching group, sized to that group's bounding box),
 * so there's no visual pop from switching rendering techniques. Field
 * resolution/triangle budget scale with group size, since a lone ball needs
 * far less detail than an actual merge, which keeps the common (mostly
 * unmerged) case cheap.
 */
export const PuyoMetaballs: React.FC<Props> = ({
  grid,
  puyos,
  cellSize,
  userPuyoIds,
}) => {
  const positionsRef = React.useRef<PositionMap>(new Map());
  const previousGroupsRef = React.useRef<Group[]>([]);
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

  const groups = React.useMemo(() => {
    // Hide top two rows for new puyos, same as the old ThreeBoard rendering.
    return getPuyoGroups(grid, puyos)
      .map((group) => ({
        ...group,
        ids: group.ids.filter((id) => {
          const [, row] = getPuyoPosition(grid, id);
          return row !== null && row > 1;
        }),
      }))
      .filter((group) => group.ids.length > 0);
  }, [grid, puyos]);

  React.useEffect(() => {
    // A group that just cleared disappears from the grid entirely, all at
    // once — spot that so it can sink away instead of popping out of
    // existence. (Can't key this off `puyos` — the store never deletes
    // cleared ids from it, only nulls their grid cells.)
    const newlyCleared = previousGroupsRef.current.filter((group) =>
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

    previousGroupsRef.current = groups;
  }, [groups, grid]);

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
          key={group.ids.slice().sort().join(',')}
          colour={group.colour}
          ids={group.ids}
          grid={grid}
          cellSize={cellSize}
          positionsRef={positionsRef}
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
  rotationArcRef,
}) => {
  const effectRef = React.useRef<any>(null);

  useFrame((_, delta) => {
    const effect = effectRef.current;

    if (!effect || !cellSize) {
      return;
    }

    const lerpFactor = 1 - Math.pow(0.0001, delta);
    const positions = positionsRef.current;

    const worldPositions: [number, number][] = ids
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

            positions.set(id, [x, y]);

            if (progress >= 1) {
              rotationArcRef.current = null;
            }

            return [x, y] as [number, number];
          }
        }

        const previous = positions.get(id);
        const x = previous
          ? previous[0] + (targetX - previous[0]) * lerpFactor
          : targetX;
        const y = previous
          ? previous[1] + (targetY - previous[1]) * lerpFactor
          : targetY;

        positions.set(id, [x, y]);

        return [x, y] as [number, number];
      })
      .filter((position): position is [number, number] => position !== null);

    if (worldPositions.length === 0) {
      return;
    }

    const { centerX, centerY, fieldScale, strength } = computeFieldLayout(
      worldPositions,
      cellSize,
    );

    effect.position.set(centerX, centerY, 0);
    effect.scale.set(fieldScale, fieldScale, fieldScale);

    effect.reset();

    worldPositions.forEach(([x, y]) => {
      const ballX = (x - centerX) / fieldScale / 2 + 0.5;
      const ballY = (y - centerY) / fieldScale / 2 + 0.5;

      effect.addBall(ballX, ballY, 0.5, strength, SUBTRACT);
    });

    // No explicit `.update()` in this three version — geometry is rebuilt
    // automatically in the mesh's onBeforeRender hook when the renderer draws it.
  });

  return (
    <marchingCubes
      ref={effectRef}
      args={[
        getResolution(ids.length),
        undefined,
        false,
        false,
        getMaxPolyCount(ids.length),
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
  // Last ball's shrink starts (positions.length - 1) * STAGGER_SECONDS in, so
  // the group's total lifetime stretches by that amount.
  const totalDuration =
    SINK_DURATION_SECONDS + (positions.length - 1) * STAGGER_SECONDS;

  useFrame((_, delta) => {
    const effect = effectRef.current;

    if (!effect || hasCompletedRef.current) {
      return;
    }

    elapsedRef.current += delta;
    const overallProgress = Math.min(1, elapsedRef.current / totalDuration);
    const overallEased = smoothstep(overallProgress);

    const { centerX, centerY, fieldScale } = layout;

    effect.position.set(
      centerX,
      centerY - overallEased * cellSize * SINK_DISTANCE_CELLS,
      0,
    );
    effect.scale.set(fieldScale, fieldScale, fieldScale);

    effect.reset();

    positions.forEach(([x, y], index) => {
      const ownElapsed = Math.max(
        0,
        elapsedRef.current - index * STAGGER_SECONDS,
      );
      const ownProgress = Math.min(1, ownElapsed / SINK_DURATION_SECONDS);
      const shrink = 1 - smoothstep(ownProgress);

      const strength = computeStrength(
        fieldScale,
        cellSize,
        TARGET_RADIUS_RATIO * shrink,
      );

      const ballX = (x - centerX) / fieldScale / 2 + 0.5;
      const ballY = (y - centerY) / fieldScale / 2 + 0.5;

      effect.addBall(ballX, ballY, 0.5, strength, SUBTRACT);
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
        getResolution(positions.length),
        undefined,
        false,
        false,
        getMaxPolyCount(positions.length),
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

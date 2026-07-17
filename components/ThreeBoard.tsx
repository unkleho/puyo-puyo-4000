import { Canvas, Dpr } from '@react-three/fiber';
import React from 'react';
import * as THREE from 'three';
import { Grid, useStore } from '../store/store';
import { ENABLE_METABALL_PUYOS, ENABLE_RAYMARCH_PUYOS } from '../shared/config';
import { getPuyoPosition } from '../shared/grid';
import { PuyoMetaballs } from './PuyoMetaballs';
import { PuyoRaymarch } from './PuyoRaymarch';
import { PuyoSphere, PuyoSphereAnimatePresence } from './PuyoSphere';
import { PuyoType } from './Puyo';

// https://codesandbox.io/s/el11e?file=/src/App.js:2033-2275

type Props = {
  grid: Grid;
  className?: string;
};

const stone600 = 'rgb(87, 83, 78)';
// const stone700 = 'rgb(68, 64, 60)'; // Original TW colour
const stone700 = 'rgb(58, 54, 50)'; // Altered colour because stone800 too dark in WebGL
const stone800 = 'rgb(41, 37, 36)';
const stone950 = 'rgb(23, 20, 18)';

// Dims the grid lines without needing a separate, darker colour constant —
// easy to tune independently of stone700's actual hue.
const GRID_LINE_OPACITY = 0.15;

// A plain native WebGL line (not drei's <Line>) for the board's grid —
// drei's <Line> renders via Line2/LineMaterial, which needs a `resolution`
// uniform matching the canvas's actual pixel size to compute a correct
// screen-space width; drei hardcodes that to a fixed 512x512 and never
// updates it, so on a canvas any other size/aspect ratio (this board is
// tall and narrow, and resizes with the window) the computed width can be
// wrong enough to round down to invisible at some sizes. These are simple
// straight 1px lines with no dashing/thickness needs, so a native line
// (always ~1px, no resolution tracking involved) sidesteps the bug
// entirely instead of working around drei's.
// Built via `<primitive>` (R3F's escape hatch for a raw three.js object,
// same pattern drei's own Line.js uses) rather than the JSX `<line>` tag —
// that tag name collides with React's own SVGProps typings for the DOM
// `<line>` element, which rejects a `geometry` prop.
export const GridLine: React.FC<{
  start: [number, number];
  end: [number, number];
  color: string;
}> = ({ start, end, color }) => {
  const line = React.useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints([
      new THREE.Vector3(start[0], start[1], 0),
      new THREE.Vector3(end[0], end[1], 0),
    ]);

    return new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: GRID_LINE_OPACITY,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start[0], start[1], end[0], end[1], color]);

  return <primitive object={line} />;
};

export const ThreeBoard: React.FunctionComponent<Props> = ({
  grid,
  className,
}) => {
  const puyos = useStore((store) => store.puyos);
  const userPuyoIds = useStore((store) => store.userPuyoIds);
  const setCellSize = useStore((store) => store.setCellSize);
  const screen = useStore((store) => store.screen);
  const padding = useStore((store) => store.padding);

  const boardPadding = 10;

  // Calculate width/height of board based on screen size, surrounding ui and global padding
  const widthAdjust = padding + 48 + 16 + 16 + 48 + padding;
  const heightAdjust = padding + 128 + 16 + padding;

  const baseWidthOnHeight =
    screen.height - heightAdjust < (screen.width - widthAdjust) * 2;

  const width = baseWidthOnHeight
    ? (screen.height - heightAdjust) / 2
    : screen.width - widthAdjust;
  const height = width * 2 - boardPadding;

  // Work out cellSize based on width of board
  const cellSize = (width - boardPadding) / 6;

  React.useEffect(() => {
    setCellSize(cellSize);
  }, [cellSize, setCellSize]);

  return (
    <div
      className={['relative border  border-stone-700 ', className || ''].join(
        ' ',
      )}
      style={{
        width,
        height,
        backgroundColor: stone950,
      }}
    >
      <Canvas
        orthographic={true}
        camera={{
          zoom: 1,
          position: [0, 0, 100],
        }}
        // Capped rather than the raw devicePixelRatio: PuyoRaymarch's cost
        // is entirely per-pixel (a fragment shader raymarching every
        // ball), so an uncapped DPR of 3 (typical on phones) means 9x the
        // shading work of DPR 1. [1, 2] still looks sharp on a small
        // mobile screen while cutting that back substantially.
        dpr={[1, 2] as Dpr}
        // MSAA is redundant here — PuyoRaymarch already anti-aliases its
        // own silhouette analytically (see the alpha/edgeDist logic in
        // that file) — and mobile GPUs pay real bandwidth for it. Only
        // downside: the grid Line meshes lose MSAA's smoothing too, so
        // they may look very slightly more jagged.
        gl={{ antialias: false }}
      >
        {ENABLE_RAYMARCH_PUYOS ? (
          <PuyoRaymarch
            grid={grid}
            puyos={puyos}
            cellSize={cellSize}
            userPuyoIds={userPuyoIds}
          />
        ) : ENABLE_METABALL_PUYOS ? (
          <PuyoMetaballs
            grid={grid}
            puyos={puyos}
            cellSize={cellSize}
            userPuyoIds={userPuyoIds}
          />
        ) : (
          <PuyoSphereAnimatePresence>
            {Object.entries(puyos).map(([id, puyo]) => {
              const [column, row] = getPuyoPosition(grid, id);

              if (column !== null && row !== null) {
                // Adjust rows
                const newRow = row - 2;

                let type: PuyoType;
                if (userPuyoIds.includes(id)) {
                  type = 'user';
                } else {
                  type = 'board';
                }

                const x = column * cellSize - cellSize * 2.5;
                const y = (newRow * cellSize - cellSize * 5.5) * -1;

                // Hide top two rows for new puyos
                if (row > 1) {
                  return (
                    <PuyoSphere
                      id={id}
                      key={id}
                      colour={puyo.colour}
                      cellSize={cellSize}
                      x={x}
                      y={y}
                      initialX={cellSize * -0.5}
                      initialY={cellSize * 6}
                      type={type}
                    />
                  );
                }
              }

              return null;
            })}
          </PuyoSphereAnimatePresence>
        )}

        {[...new Array(11)].map((_, i) => {
          const y = i * cellSize - cellSize * 5;
          return (
            <GridLine
              start={[-3 * cellSize, y]}
              end={[3 * cellSize, y]}
              color={stone700}
              key={i}
            />
          );
        })}

        {[...new Array(5)].map((_, i) => {
          const x = i * cellSize - cellSize * 2;
          return (
            <GridLine
              start={[x, -6 * cellSize]}
              end={[x, 6 * cellSize]}
              color={stone700}
              key={i}
            />
          );
        })}

        {/*An ambient light that creates a soft light against the object */}
        <ambientLight intensity={0.4} />
        {/*An directional light which aims form the given position */}
        <directionalLight position={[10, 10, 5]} intensity={1} />
        {/*An point light, basically the same as directional. This one points from under */}
        <pointLight position={[0, -10, 5]} intensity={1} />
      </Canvas>
    </div>
  );
};

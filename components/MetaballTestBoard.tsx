import { Canvas } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import React from 'react';
import { Grid, Puyos, PuyoColour } from '../store/store';
import { getPuyoPosition } from '../shared/grid';
import { PuyoSphere } from './PuyoSphere';
import { PuyoMetaballs } from './PuyoMetaballs';
import { PuyoRaymarch } from './PuyoRaymarch';

const stone700 = 'rgb(58, 54, 50)';
const stone950 = 'rgb(23, 20, 18)';

const CELL_SIZE = 50;
const COLUMNS = 6;
const ROWS = 14;

// [column, row] pairs, row 2 is the topmost visible row (rows 0-1 are hidden,
// same as the real board). Grouped to cover the layouts worth checking:
// touching pairs, an isolated ball, a diagonal pair and a 2x2 cluster.
const TEST_POSITIONS: [number, number][] = [
  [1, 3],
  [1, 4], // vertical pair -> should merge

  [3, 3],
  [4, 3], // horizontal pair -> should merge

  [0, 10], // isolated -> should NOT merge with anything

  [1, 6],
  [2, 7], // diagonal pair -> edge case, further apart than orthogonal neighbours

  [4, 8],
  [5, 8],
  [4, 9],
  [5, 9], // 2x2 cluster -> should merge into one blob
];

function buildTestData(): { grid: Grid; puyos: Puyos } {
  const grid: Grid = Array.from({ length: ROWS }, () =>
    new Array(COLUMNS).fill(null),
  );
  const puyos: Puyos = {};

  TEST_POSITIONS.forEach(([column, row], index) => {
    const id = String(index);
    grid[row][column] = id;
    puyos[id] = { colour: PuyoColour.RED };
  });

  return { grid, puyos };
}

/**
 * Standalone board with a fixed set of static red puyos, for tuning the
 * PuyoMetaballs merge look without needing to play the game.
 */
type RenderMode = 'raymarch' | 'metaballs' | 'spheres';

const RENDER_MODES: RenderMode[] = ['raymarch', 'metaballs', 'spheres'];

export const MetaballTestBoard: React.FC = () => {
  const [renderMode, setRenderMode] = React.useState<RenderMode>('raymarch');
  const { grid, puyos } = React.useMemo(buildTestData, []);

  const width = CELL_SIZE * COLUMNS;
  const height = CELL_SIZE * (ROWS - 2);

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        className="rounded bg-stone-700 px-3 py-1.5 text-sm text-stone-100 hover:bg-stone-600"
        onClick={() =>
          setRenderMode(
            (value) =>
              RENDER_MODES[
                (RENDER_MODES.indexOf(value) + 1) % RENDER_MODES.length
              ],
          )
        }
      >
        Showing {renderMode} (click to cycle)
      </button>

      <div
        className="relative border border-stone-700"
        style={{ width, height, backgroundColor: stone950 }}
      >
        <Canvas
          orthographic={true}
          camera={{
            zoom: 1,
            position: [0, 0, 100],
          }}
        >
          {renderMode === 'raymarch' ? (
            <PuyoRaymarch
              grid={grid}
              puyos={puyos}
              cellSize={CELL_SIZE}
              // No user-controlled piece on this static test board.
              userPuyoIds={['none-1', 'none-2']}
            />
          ) : renderMode === 'metaballs' ? (
            <PuyoMetaballs
              grid={grid}
              puyos={puyos}
              cellSize={CELL_SIZE}
              // No user-controlled piece on this static test board.
              userPuyoIds={['none-1', 'none-2']}
            />
          ) : (
            Object.entries(puyos).map(([id, puyo]) => {
              const [column, row] = getPuyoPosition(grid, id);

              if (column === null || row === null) {
                return null;
              }

              const newRow = row - 2;
              const x = column * CELL_SIZE - CELL_SIZE * 2.5;
              const y = (newRow * CELL_SIZE - CELL_SIZE * 5.5) * -1;

              return (
                <PuyoSphere
                  id={id}
                  key={id}
                  colour={puyo.colour}
                  cellSize={CELL_SIZE}
                  x={x}
                  y={y}
                  initialX={x}
                  initialY={y}
                  type="board"
                />
              );
            })
          )}

          {[...new Array(11)].map((_, i) => {
            const y = i * CELL_SIZE - CELL_SIZE * 5;
            return (
              <Line
                points={[
                  [-3 * CELL_SIZE, y, 0],
                  [3 * CELL_SIZE, y, 0],
                ]}
                color={stone700}
                lineWidth={1}
                key={i}
              />
            );
          })}

          {[...new Array(5)].map((_, i) => {
            const x = i * CELL_SIZE - CELL_SIZE * 2;
            return (
              <Line
                points={[
                  [x, -6 * CELL_SIZE, 0],
                  [x, 6 * CELL_SIZE, 0],
                ]}
                color={stone700}
                lineWidth={1}
                key={i}
              />
            );
          })}

          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[0, -10, 5]} intensity={1} />
        </Canvas>
      </div>
    </div>
  );
};

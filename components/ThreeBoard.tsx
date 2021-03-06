import { Canvas, Dpr } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { PuyoType } from './Puyo';
import React from 'react';
import { Grid, useStore } from '../store/store';
import { PuyoSphere, PuyoSphereAnimatePresence } from './PuyoSphere';
import { getPuyoPosition } from '../shared/grid';

// https://codesandbox.io/s/el11e?file=/src/App.js:2033-2275

type Props = {
  grid: Grid;
  className?: string;
};

const devicePixelRatio =
  typeof window === 'object' ? window.devicePixelRatio : null;

const stone600 = 'rgb(87, 83, 78)';
// const stone700 = 'rgb(68, 64, 60)'; // Original TW colour
const stone700 = 'rgb(58, 54, 50)'; // Altered colour because stone800 too dark in WebGL
const stone800 = 'rgb(41, 37, 36)';
const stone950 = 'rgb(23, 20, 18)';

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
        dpr={devicePixelRatio as Dpr}
      >
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

        {[...new Array(11)].map((_, i) => {
          const y = i * cellSize - cellSize * 5;
          return (
            <Line
              points={[
                [-3 * cellSize, y, 0],
                [3 * cellSize, y, 0],
              ]}
              color={stone700}
              lineWidth={1}
              key={i}
            />
          );
        })}

        {[...new Array(5)].map((_, i) => {
          const x = i * cellSize - cellSize * 2;
          return (
            <Line
              points={[
                [x, -6 * cellSize, 0],
                [x, 6 * cellSize, 0],
              ]}
              color={stone700}
              lineWidth={1}
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

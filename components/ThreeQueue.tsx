import { Canvas, Dpr } from '@react-three/fiber';
import React from 'react';
import { usePrevious } from '../hooks/use-previous';
import { PuyoColour, useStore } from '../store/store';
import { Puyo } from './Puyo';
import { PuyoSphere, PuyoSphereAnimatePresence } from './PuyoSphere';
import { SciFiBox } from './SciFiBox';

type Props = {
  className?: string;
};

const devicePixelRatio =
  typeof window === 'object' ? window.devicePixelRatio : null;

export const ThreeQueue: React.FC<Props> = ({ className }) => {
  const puyoIds = useStore((state) => state.nextPuyoIds);
  const puyos = useStore((state) => state.puyos);
  const cellSize = useStore((state) => state.cellSize);

  // Work out puyos that were removed from queue and put into board
  const prevPuyoIds: string[] = usePrevious(puyoIds);
  const prevPuyoIdsToRemove = prevPuyoIds?.filter(
    (id) => !puyoIds.includes(id),
  );
  const puyosToRemove = prevPuyoIdsToRemove?.map((id) => puyos[id]);
  // console.log(puyosToRemove);

  // if (isNaN(cellSize)) {
  //   return null;
  // }

  return (
    <div
      className={['relative', className || ''].join(' ')}
      style={{
        width: cellSize,
        height: cellSize * 4 + 5,
      }}
    >
      <SciFiBox
        className="absolute w-full"
        borders={{
          left: 'hide',
          topRight: 'top',
          topLeft: 'top',
          bottomLeft: 'bottom',
          right: 'hide',
          // bottomRight: 'bottom',
        }}
      />

      <Canvas
        orthographic={true}
        camera={{
          zoom: 1,
          position: [0, 0, 100],
        }}
        dpr={devicePixelRatio as Dpr}
      >
        <PuyoSphereAnimatePresence>
          {puyoIds.map((id, index) => {
            const puyo = puyos[id];
            const puyoSet: 'first' | 'second' = index >= 2 ? 'second' : 'first';
            const newCellSize =
              puyoSet === 'second' ? cellSize * 0.7 : cellSize * 0.8;
            const y =
              (puyoIds.length - 1 - index) * newCellSize - newCellSize * 1.5;
            const gap =
              puyoSet === 'second' ? newCellSize / 2 : cellSize * -0.2;

            return (
              <PuyoSphere
                id={id}
                colour={puyo.colour}
                cellSize={newCellSize}
                x={0}
                y={y - gap}
                initialX={0}
                initialY={cellSize * -3}
                type="board"
                key={id}
              />
            );
          })}
        </PuyoSphereAnimatePresence>

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

import { Canvas, Dpr } from '@react-three/fiber';
import { useStore } from '../store/store';
import { Puyo } from './Puyo';
import { PuyoSphere } from './PuyoSphere';

type Props = {
  className?: string;
};

const devicePixelRatio =
  typeof window === 'object' ? window.devicePixelRatio : null;

export const ThreeQueue: React.FC<Props> = ({ className }) => {
  const puyoIds = useStore((state) => state.nextPuyoIds);
  const puyos = useStore((state) => state.puyos);
  const cellSize = useStore((state) => state.cellSize);

  // if (isNaN(cellSize)) {
  //   return null;
  // }

  return (
    <div
      className={['relative', className || ''].join(' ')}
      style={{
        width: cellSize,
        height: cellSize * 4,
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
        {puyoIds.map((id, index) => {
          const puyo = puyos[id];
          const puyoSet: 'first' | 'second' = index >= 2 ? 'second' : 'first';
          const newCellSize =
            puyoSet === 'second' ? cellSize * 0.7 : cellSize * 0.8;
          const y =
            (puyoIds.length - 1 - index) * newCellSize - newCellSize * 1.5;
          const gap = puyoSet === 'second' ? newCellSize / 2 : cellSize * -0.2;

          return (
            <PuyoSphere
              id={id}
              colour={puyo.colour}
              cellSize={newCellSize}
              x={0}
              // x={puyoSet === 'second' ? cellSize * 0.1 : 0}
              y={y - gap}
              // y={index * cellSize + gap}
              key={id}
            />
          );
        })}

        {/*An ambient light that creates a soft light against the object */}
        <ambientLight intensity={0.3} />
        {/*An directional light which aims form the given position */}
        <directionalLight position={[10, 10, 5]} intensity={1} />
        {/*An point light, basically the same as directional. This one points from under */}
        <pointLight position={[0, -10, 5]} intensity={1} />
      </Canvas>
    </div>
  );
};

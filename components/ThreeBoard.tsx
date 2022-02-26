import { Canvas, Dpr, useThree } from '@react-three/fiber';
import { motion } from 'framer-motion-3d';
import {
  Line,
  MeshDistortMaterial,
  MeshWobbleMaterial,
  OrthographicCamera,
  QuadraticBezierLine,
  Sphere,
} from '@react-three/drei';
import { PuyoColour } from '../store/store';
import { PuyoType } from './Puyo';
import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { getPuyoPosition, Grid, useStore } from '../store/store';
// import useDimensions from 'react-use-dimensions';
import useMeasure from 'react-use-measure';
import { PuyoSphere } from './PuyoSphere';

// codesandbox.io/s/el11e?file=/src/App.js:2033-2275

https: type Props = {
  grid: Grid;
  className?: string;
  // children: React.ReactNode;
};

const devicePixelRatio =
  typeof window === 'object' ? window.devicePixelRatio : null;

export const ThreeBoard: React.FunctionComponent<Props> = ({
  grid,
  className,
}) => {
  const puyos = useStore((store) => store.puyos);
  const userPuyoIds = useStore((store) => store.userPuyoIds);
  const puyoIdsToClear = useStore((store) => store.puyoIdsToClear);
  const setCellSize = useStore((store) => store.setCellSize);
  const screen = useStore((store) => store.screen);

  const widthAdjust = 90;
  const heightAdjust = 220;

  // Calculate width/height of board based on screen size and surrounding ui
  const width =
    screen.height - heightAdjust < (screen.width - widthAdjust) * 2
      ? (screen.height - heightAdjust) / 2
      : screen.width - widthAdjust;
  const height = width * 2;
  const cellSize = width / 6;

  React.useEffect(() => {
    setCellSize(cellSize);
  }, [cellSize, setCellSize]);

  return (
    <div
      className={['relative bg-stone-900', className || ''].join(' ')}
      style={{
        width,
        height,
        // borderRadius: (cellSize / 2) * 1,
      }}
    >
      <Canvas
        orthographic={true}
        camera={{
          // near: 50,
          // far: 10000,
          // fov: 100,
          zoom: 1,
          // near: 0.1, far: 10000,
          position: [0, 0, 100],
        }}
        dpr={devicePixelRatio as Dpr}
        // style={{
        //   width: '100%',
        //   // height: width * 2,
        // }}
      >
        {/* <PuyoSphere id="test" colour={PuyoColour.GREEN} /> */}
        {/* <orthographicCamera args={[0, 0, 0, 0, 0, 0]} zoom={10} /> */}
        {/* <OrthographicCamera makeDefault /> */}

        {/* <QuadraticBezierLine
          start={[cellSize * -3, cellSize * 5, 0]}
          end={[cellSize * -2, cellSize * 6, 0]}
          color="white"
        />
        <QuadraticBezierLine
          start={[cellSize * -2, cellSize * 6, 0]}
          end={[cellSize * 2, cellSize * 6, 0]}
          color="white"
        />
        <QuadraticBezierLine
          start={[cellSize * 2, cellSize * 6, 0]}
          end={[cellSize * 3, cellSize * 5, 0]}
          color="white"
        /> */}

        <AnimatePresence>
          {Object.entries(puyos).map(([id, puyo]) => {
            const [column, row] = getPuyoPosition(grid, id);

            if (column !== null && row !== null) {
              // Adjust rows
              const newRow = row - 2;

              let type: PuyoType;
              if (puyoIdsToClear.includes(id)) {
                type = 'to-clear';
              } else if (userPuyoIds.includes(id)) {
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
                    type={type}
                  />
                );
              }
            }

            return null;
          })}
        </AnimatePresence>

        {/* <Line
          points={[
            [0, 0, 0],
            [3 * cellSize, 0, 0],
          ]} // Array of points
          color="white" // Default
          lineWidth={1} // In pixels (default)
        />

        <Line
          points={[
            [0, 0, 0],
            [0, 320, 0],
          ]} // Array of points
          color="white" // Default
          lineWidth={1} // In pixels (default)
        /> */}

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

export function Material() {
  return <meshPhongMaterial color="#fff" specular="#61dafb" shininess={10} />;
}

export function Lights() {
  return (
    <>
      <spotLight color="#61dafb" position={[-10, -10, -10]} intensity={0.2} />
      <spotLight color="#61dafb" position={[-10, 0, 15]} intensity={0.8} />
      <spotLight color="#61dafb" position={[-5, 20, 2]} intensity={0.5} />
      <spotLight color="#f2056f" position={[15, 10, -2]} intensity={2} />
      <spotLight color="#f2056f" position={[15, 10, 5]} intensity={1} />
      <spotLight color="#b107db" position={[5, -10, 5]} intensity={0.8} />
    </>
  );
}

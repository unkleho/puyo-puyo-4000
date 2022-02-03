import { Canvas, useThree } from '@react-three/fiber';
import { motion } from 'framer-motion-3d';
import {
  MeshDistortMaterial,
  MeshWobbleMaterial,
  OrthographicCamera,
  Sphere,
} from '@react-three/drei';
import { PuyoColour } from '../store/store';
import { PuyoType } from './Puyo';
import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { getPuyoPosition, Grid, useStore } from '../store/store';

type Props = {
  grid: Grid;
  className?: string;
  // children: React.ReactNode;
};

type PuyoSphereProps = {
  id: string;
  colour: PuyoColour;
  cellSize: number;
  x?: number;
  y?: number;
  type?: PuyoType;
};

const colours = {
  [PuyoColour.BLUE]: '#2563EB',
  [PuyoColour.RED]: '#DC2626',
  [PuyoColour.YELLOW]: '#CA8A04',
  [PuyoColour.GREEN]: '#15803D',
  [PuyoColour.PURPLE]: '#9333EA',
};

const PuyoSphere: React.FC<PuyoSphereProps> = ({
  id,
  colour,
  cellSize,
  x,
  y,
  type,
}) => {
  return (
    <motion.mesh
      key={id}
      // visible // object gets render if true
      // userData={{ test: 'hello' }} // An object that can be used to store custom data about the Object3d
      position={[0, 0, 0]} // The position on the canvas of the object [x,y,x]
      rotation={[0, 0, 0]} // The rotation of the object
      castShadow // Sets whether or not the object cats a shadow
      initial={{
        x: -0.5,
        y: 5,
      }}
      // There are many more props.....
      animate={{
        x: x / 40 - 1.9,
        y: (y / 40 - 4.1) * -1,
        scale: 1,
      }}
      exit={{
        scale: 0.1,
      }}
    >
      {/* A spherical shape*/}
      {/* <sphereGeometry attach="geometry" args={[0.34, 16, 16]} /> */}
      <Sphere visible args={[0.34, 16, 16]}>
        <MeshWobbleMaterial
          attach="material"
          color={colours[colour]}
          // factor={30} // Strength, 0 disables the effect (default=1)
          // speed={2} // Speed (default=1)
          roughness={0}
        />
      </Sphere>

      {/* A standard mesh material*/}
      {/* <meshStandardMaterial
        attach="material" // How the element should attach itself to its parent
        color={colours[colour]} // The color of the material
        transparent // Defines whether this material is transparent. This has an effect on rendering as transparent objects need special treatment and are rendered after non-transparent objects. When set to true, the extent to which the material is transparent is controlled by setting it's .opacity property.
        roughness={0.1} // The roughness of the material - Defaults to 1
        metalness={0.1} // The metalness of the material - Defaults to 0
      /> */}
    </motion.mesh>
  );
};

const devicePixelRatio =
  typeof window === 'object' ? window.devicePixelRatio : null;

export const ThreeBoard: React.FunctionComponent<Props> = ({
  grid,
  className,
}) => {
  // const grid = useStore((store) => store.grid);
  const cellSize = useStore((store) => store.cellSize);
  const puyos = useStore((store) => store.puyos);
  const userPuyoIds = useStore((store) => store.userPuyoIds);
  const puyoIdsToClear = useStore((store) => store.puyoIdsToClear);

  // console.log('render');

  return (
    <div
      className={['relative', className || ''].join(' ')}
      style={{ width: cellSize * 6, height: cellSize * 12 }}
    >
      <Canvas
        orthographic={true}
        camera={{
          // near: 50,
          // far: 10000,
          // fov: 100,
          zoom: 40,
          // near: 0.1, far: 10000,
          // position: [8, 10, 10],
        }}
        dpr={devicePixelRatio}
      >
        {/* <PuyoSphere id="test" colour={PuyoColour.GREEN} /> */}
        {/* <orthographicCamera args={[0, 0, 0, 0, 0, 0]} zoom={10} /> */}
        {/* <OrthographicCamera makeDefault /> */}
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

              // Hide top two rows for new puyos
              if (row > 1) {
                return (
                  <PuyoSphere
                    id={id}
                    key={id}
                    colour={puyo.colour}
                    cellSize={cellSize}
                    x={column * cellSize}
                    y={newRow * cellSize}
                    type={type}
                  />
                );
              }
            }

            return null;
          })}
        </AnimatePresence>

        {/*An ambient light that creates a soft light against the object */}
        <ambientLight intensity={0.5} />
        {/*An directional light which aims form the given position */}
        <directionalLight position={[10, 10, 5]} intensity={1} />
        {/*An point light, basically the same as directional. This one points from under */}
        <pointLight position={[0, -10, 5]} intensity={1} />
      </Canvas>

      {/* <div className="bg-slate-800">
        {grid
          // Hide top two rows for new puyos
          .filter((row, r) => r > 1)
          .map((columns, i) => {
            return (
              <div className="flex" key={i}>
                {columns.map((column, j) => {
                  return (
                    <div
                      key={j}
                      className="outline outline-[0.5px] outline-slate-700"
                      style={{
                        width: cellSize,
                        height: cellSize,
                      }}
                    ></div>
                  );
                })}
              </div>
            );
          })}
      </div> */}
    </div>
  );
};

// export const ThreeBoard = () => {
//   return (
//     <>
//       <Canvas>
//         <PuyoSphere id="test" colour={PuyoColour.GREEN} />
//         {/*An ambient light that creates a soft light against the object */}
//         <ambientLight intensity={0.5} />
//         {/*An directional light which aims form the given position */}
//         <directionalLight position={[10, 10, 5]} intensity={1} />
//         {/*An point light, basically the same as directional. This one points from under */}
//         <pointLight position={[0, -10, 5]} intensity={1} />
//       </Canvas>
//     </>
//   );
// };

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

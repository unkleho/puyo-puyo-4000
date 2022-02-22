import { motion } from 'framer-motion-3d';
import { PuyoColour } from '../store/store';
import { PuyoType } from './Puyo';

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

export const PuyoSphere: React.FC<PuyoSphereProps> = ({
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
        x: cellSize * -0.5,
        y: cellSize * 6,
      }}
      // initial={{
      //   x: -0.5,
      //   y: 5,
      // }}
      // There are many more props.....
      animate={{
        // x: x / 40 - 1.9,
        // y: (y / 40 - 4.1) * -1,
        x: x - cellSize * 2.5,
        y: (y - cellSize * 5.5) * -1,
        scale: 1,
      }}
      exit={{
        scale: 0.1,
      }}
    >
      {/* A spherical shape*/}
      <sphereGeometry attach="geometry" args={[(cellSize / 2) * 0.9, 16, 16]} />
      {/* <Sphere visible args={[cellSize / 2, 16, 16]}>
        <MeshWobbleMaterial
          attach="material"
          color={colours[colour]}
          // factor={30} // Strength, 0 disables the effect (default=1)
          // speed={2} // Speed (default=1)
          roughness={0}
        />
      </Sphere> */}

      {/* A standard mesh material*/}
      <meshStandardMaterial
        attach="material" // How the element should attach itself to its parent
        color={colours[colour]} // The color of the material
        transparent // Defines whether this material is transparent. This has an effect on rendering as transparent objects need special treatment and are rendered after non-transparent objects. When set to true, the extent to which the material is transparent is controlled by setting it's .opacity property.
        roughness={0.1} // The roughness of the material - Defaults to 1
        metalness={0.1} // The metalness of the material - Defaults to 0
      />
    </motion.mesh>
  );
};

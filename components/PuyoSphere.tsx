import { motion } from 'framer-motion-3d';
import React from 'react';
import { usePrevious } from '../hooks/use-previous';
import { PuyoColour, PuyoMoveType } from '../store/store';
import { PuyoType } from './Puyo';

type PuyoSphereProps = {
  id: string;
  colour: PuyoColour;
  cellSize: number;
  x?: number;
  y?: number;
  initialX?: number;
  initialY?: number;
  type?: PuyoType;
  moveType?: PuyoMoveType;
};

const colours = {
  [PuyoColour.BLUE]: '#2563EB',
  [PuyoColour.RED]: '#DC2626',
  [PuyoColour.YELLOW]: '#CA8A04',
  [PuyoColour.GREEN]: '#15803D',
  [PuyoColour.PURPLE]: '#9333EA', // purple-600
};

export const PuyoSphere: React.FC<PuyoSphereProps> = ({
  id,
  colour,
  cellSize,
  x,
  y,
  initialX,
  initialY,
  type,
  moveType,
}) => {
  if (x == null || y == null) {
    return null;
  }

  return (
    <motion.mesh
      key={id}
      position={[0, 0, 0]} // The position on the canvas of the object [x,y,x]
      rotation={[0, 0, 0]} // The rotation of the object
      castShadow // Sets whether or not the object cats a shadow
      initial={{
        x: initialX,
        y: initialY,
      }}
      animate={{
        x,
        y,
        scale: type === 'to-clear' ? 0.005 : 1,
      }}
      // TODO: Experiment with smooth drop
      // transition={
      //   !moveType
      //     ? {
      //         type: 'tween',
      //         duration: 0.6,
      //         ease: 'linear',
      //       }
      //     : null
      // }
      // Exit not working with framer-motion-3d
      // exit={{
      //   scale: 0.1,
      // }}
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

// Cut price version of framer-motion's AnimatePresence for PuyoSphere
// This is an abstraction for animating out cleared PuyoSpheres
export const PuyoSphereAnimatePresence: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const currentKeys: string[] = [];
  const currentChildren = React.Children.map(children, (child: any) => {
    if (child) {
      currentKeys.push('.$' + child.key);
    }
    return child;
  });
  const prevChildren = usePrevious(currentChildren);

  return (
    <>
      {prevChildren
        ?.filter((child: any) => {
          // Only show prev children that don't exist anymore
          // console.log(child.key);
          return !currentKeys.includes(child.key);
        })
        .map((child: any) => {
          if (typeof child === 'object') {
            return child.type({
              ...child.props,
              initialX: child.props.x,
              initialY: child.props.y,
              type: 'to-clear',
            });
          }
        })}

      {currentChildren?.map((child: any) => {
        // console.log(child);

        if (typeof child === 'object') {
          return child.type(child.props);
        }
      })}
    </>
  );
};

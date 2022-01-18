import { motion } from 'framer-motion';
import { PuyoColour } from '../store/store';

type Props = {
  id: string;
  colour: PuyoColour;
  cellSize: number;
  x?: number;
  y?: number;
};

const colours = {
  [PuyoColour.BLUE]: 'bg-blue-400',
  [PuyoColour.RED]: 'bg-red-600',
  [PuyoColour.YELLOW]: 'bg-yellow-400',
  [PuyoColour.GREEN]: 'bg-green-700',
  [PuyoColour.PURPLE]: 'bg-violet-600',
};

export const Puyo: React.FunctionComponent<Props> = ({
  id,
  colour,
  cellSize,
  x,
  y,
}) => {
  return (
    <motion.div
      // layout
      // layoutId={id}
      key={id}
      style={{
        position: 'absolute',
      }}
      className={colours[colour]}
      animate={{
        top: y,
        left: x,
        width: cellSize,
        height: cellSize,
        // backgroundColor: colour,
        borderRadius: cellSize / 2,
        scale: 0.9,
      }}
      exit={{
        scale: 0.1,
      }}
    ></motion.div>
  );
};

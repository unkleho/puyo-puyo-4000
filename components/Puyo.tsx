import { motion, Transition } from 'framer-motion';
import { PuyoColour } from '../store/store';

export type PuyoType = 'user' | 'board' | 'to-clear';

type Props = {
  id: string;
  colour: PuyoColour;
  cellSize: number;
  x?: number;
  y?: number;
  type?: PuyoType;
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
  type,
}) => {
  let transition: Transition = {};
  if (type === 'board') {
    transition = {
      type: 'spring',
      bounce: 0.3,
    };
  } else if (type === 'to-clear') {
    transition = {
      type: 'tween',
      ease: 'easeIn',
      duration: 0.2,
    };
  }

  return (
    <motion.div
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
        borderRadius: cellSize / 2,
        scale: 0.9,
        zIndex: type === 'to-clear' ? 0 : 10,
      }}
      exit={{
        scale: 0.01,
      }}
      transition={transition}
    ></motion.div>
  );
};

import { motion } from 'framer-motion';
import { PuyoColour } from '../store/store';

type Props = {
  id: string;
  colour: PuyoColour;
  x?: number;
  y?: number;
};

export const Puyo: React.FunctionComponent<Props> = ({ id, colour, x, y }) => {
  return (
    <motion.div
      layout
      layoutId={id}
      key={id}
      style={{
        position: 'absolute',
      }}
      animate={{
        top: y,
        left: x,
        width: 20,
        height: 20,
        backgroundColor: colour,
        borderRadius: 10,
      }}
      exit={{
        scale: 0.1,
      }}
    ></motion.div>
  );
};

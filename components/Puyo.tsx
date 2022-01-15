import { motion } from 'framer-motion';
import { PuyoColour } from '../store/store';

type Props = {
  id: string;
  colour: PuyoColour;
  // state: PuyoState;
  x?: number;
  y?: number;
  rotate?: number;
  transformOrigin?: string;
};

export const Puyo: React.FunctionComponent<Props> = ({
  id,
  colour,
  // state,
  x,
  y,
  rotate,
  transformOrigin = 'center',
}) => {
  // console.log(id, x, y);

  return (
    <motion.div
      layout
      layoutId={id}
      style={{
        // position: state === 'queue' ? 'relative' : 'absolute',
        position: 'absolute',
      }}
      animate={{
        top: y,
        left: x,
        width: 20,
        height: 20,
        backgroundColor: colour,
        borderRadius: 10,
        rotate,
        transformOrigin,
      }}
    ></motion.div>
  );
};

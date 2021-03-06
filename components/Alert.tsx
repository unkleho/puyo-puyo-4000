import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import { SVGBox } from './SVGBox';

type Props = {
  isActive?: boolean;
  width?: number;
  height?: number;
  cornerRatio?: number;
  children: React.ReactNode;
  onClick: () => void;
};

export const Alert: React.FC<Props> = ({
  isActive,
  width = 150,
  height = 100,
  children,
  onClick,
}) => {
  return (
    <AnimatePresence>
      {isActive && (
        <button
          className="absolute top-[50%] left-[50%] text-center uppercase leading-none tracking-widest transition-colors hover:text-fuchsia-600"
          style={{
            transform: 'translate(-50%, -50%)',
            width,
            height,
          }}
          onClick={onClick}
        >
          <SVGBox />

          <motion.span
            className="absolute top-[50%] left-[50%]"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            {children}
          </motion.span>
        </button>
      )}
    </AnimatePresence>
  );
};

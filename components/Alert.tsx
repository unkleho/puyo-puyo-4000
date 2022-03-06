import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';

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
  cornerRatio = 0.1,
  children,
  onClick,
}) => {
  // Ensure 45 angle
  const cornerHeightRatio = (width / height) * cornerRatio;

  const cornerStartWidth = width * cornerRatio;
  const cornerStartHeight = height * cornerHeightRatio;
  const cornerEndWidth = width * (1 - cornerRatio);
  const cornerEndHeight = height * (1 - cornerHeightRatio);

  return (
    <AnimatePresence>
      {isActive && (
        <button
          className="absolute top-[50%] left-[50%] text-center uppercase leading-none tracking-widest hover:text-fuchsia-600"
          style={{
            transform: 'translate(-50%, -50%)',
          }}
          onClick={onClick}
        >
          <svg viewBox="0 0" width={width} height={height}>
            <motion.path
              d={`
                M 0 ${height * 0.5} 
                V ${cornerStartHeight} 
                L ${cornerStartWidth} 0 
                H ${cornerEndWidth} 
                L ${width} ${cornerStartHeight} 
                V ${cornerEndHeight} 
                L ${cornerEndWidth} ${height} 
                H ${cornerStartWidth} 
                L 0 ${cornerEndHeight}
              `}
              fill="rgb(18 15 13)"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 0.9,
              }}
              exit={{
                opacity: 0,
              }}
            ></motion.path>

            {[
              `M 0 ${
                height * 0.45
              } L 0 ${cornerStartHeight} L ${cornerStartWidth} 0`,
              `M 0 ${
                height * 0.55
              } L 0 ${cornerEndHeight} L ${cornerStartWidth} ${height}`,
              `M ${width} ${
                height * 0.45
              } L ${width} ${cornerStartHeight} L ${cornerEndWidth} 0`,
              `M ${width} ${
                height * 0.55
              } L ${width} ${cornerEndHeight} L ${cornerEndWidth} ${height}`,
            ].map((d, i) => {
              return (
                <motion.path
                  d={d}
                  // stone-700
                  // stroke="rgb(65 64 60)"
                  stroke="rgb(95 94 90)"
                  strokeWidth={1.5}
                  fill="none"
                  initial={{
                    pathLength: 0,
                  }}
                  animate={{
                    pathLength: 1,
                  }}
                  exit={{
                    pathLength: 0,
                  }}
                  transition={{
                    duration: 0.5,
                  }}
                  key={i}
                ></motion.path>
              );
            })}
          </svg>

          <motion.span
            className="absolute top-[50%] left-[50%] "
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

import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';

type Props = {
  isActive: boolean;
  children: React.ReactNode;
  onClick: () => void;
};

const width = 150;
const height = 100;

export const Alert: React.FC<Props> = ({ isActive, children, onClick }) => {
  return (
    <AnimatePresence>
      {isActive && (
        <button
          className="absolute top-[50%] left-[50%] text-center uppercase leading-none tracking-widest"
          style={{
            transform: 'translate(-50%, -50%)',
          }}
          onClick={onClick}
        >
          <svg viewBox="0 0 " width={width} height={height}>
            <motion.path
              d={`
          M 0 ${height * 0.5} 
          V ${height * 0.1} 
          L ${width * 0.1} 0 
          H ${width * 0.9} 
          L ${width} ${height * 0.1} 
          V ${height * 0.9} 
          L ${width * 0.9} ${height} 
          H ${width * 0.1} 
          L 0 ${height * 0.9}
        `}
              fill="rgb(18 15 13)"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 0.7,
              }}
              exit={{
                opacity: 0,
              }}
            ></motion.path>

            {[
              `M 0 ${height * 0.45} L 0 ${height * 0.1} L ${width * 0.1} 0`,
              `M 0 ${height * 0.55} L 0 ${height * 0.9} L ${
                width * 0.1
              } ${height}`,
              `M ${width} ${height * 0.45} L ${width} ${height * 0.1} L ${
                width * 0.9
              } 0`,
              `M ${width} ${height * 0.55} L ${width} ${height * 0.9} L ${
                width * 0.9
              } ${height}`,
            ].map((d, i) => {
              return (
                <motion.path
                  d={d}
                  // stone-700
                  stroke="rgb(65 64 60)"
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

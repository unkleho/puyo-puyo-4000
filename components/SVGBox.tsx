import { motion } from 'framer-motion';
import React from 'react';
import useMeasure from 'react-use-measure';

type Props = {
  cornerRatio?: number;
  cornerSize?: number;
};

export const SVGBox: React.FC<Props> = ({
  cornerRatio = 0.1,
  cornerSize = 16,
}) => {
  // Use use container to set width and height of SVG
  const [containerRef, { width, height }] = useMeasure();

  // Ensure 45 angle
  const cornerHeightRatio = (width / height) * cornerRatio;

  const cornerStartWidth = cornerSize;
  const cornerStartHeight = cornerSize;
  const cornerEndWidth = width - cornerSize;
  const cornerEndHeight = height - cornerSize;

  return (
    <motion.span ref={containerRef} className="relative block h-full w-full">
      <motion.svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0"
        width={'100%'}
        height={'100%'}
      >
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
          // fill="rgb(18 15 13)"
          className="fill-stone-900"
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
            height / 2 - cornerSize / 2
          } L 0 ${cornerStartHeight} L ${cornerStartWidth} 0`,
          `M 0 ${
            height / 2 + cornerSize / 2
          } L 0 ${cornerEndHeight} L ${cornerStartWidth} ${height}`,
          `M ${width} ${
            height / 2 - cornerSize / 2
          } L ${width} ${cornerStartHeight} L ${cornerEndWidth} 0`,
          `M ${width} ${
            height / 2 + cornerSize / 2
          } L ${width} ${cornerEndHeight} L ${cornerEndWidth} ${height}`,
        ].map((d, i) => {
          return (
            <motion.path
              d={d}
              // stone-700
              // stroke="rgb(65 64 60)"
              stroke="rgb(95 94 90)"
              strokeWidth={1}
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
                ease: 'easeInOut',
              }}
              key={i}
            ></motion.path>
          );
        })}
      </motion.svg>
    </motion.span>
  );
};

import { motion } from 'framer-motion';
import React from 'react';
import useMeasure from 'react-use-measure';

type Props = {
  cornerSize?: number;
  boxFill?: 'stone' | 'black';
  className?: string;
};

export const SVGBox: React.FC<Props> = ({
  cornerSize = 16,
  boxFill = 'stone',
  className,
}) => {
  // Use container to set width and height of SVG
  const [containerRef, { width, height }] = useMeasure();

  const cornerStartWidth = cornerSize;
  const cornerStartHeight = cornerSize;
  const cornerEndWidth = width - cornerSize;
  const cornerEndHeight = height - cornerSize;

  return (
    <motion.span
      ref={containerRef}
      className={['relative block h-full w-full', className || ''].join(' ')}
    >
      <motion.svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0"
        width={'100%'}
        height={'100%'}
        style={{
          filter: 'drop-shadow(1px 1px 16px rgb(0 0 0 / 0.5))',
        }}
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
          className={[
            boxFill === 'stone' ? 'fill-stone-900' : '',
            boxFill === 'black' ? 'fill-black' : '',
          ].join(' ')}
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
        ></motion.path>

        {[
          `M 0 ${height / 2 - cornerSize / 2}
          L 0 ${cornerStartHeight} 
          L ${cornerStartWidth} 0
          L ${width / 2 - cornerSize / 2} 0`,
          `M 0 ${height / 2 + cornerSize / 2} 
          L 0 ${cornerEndHeight} 
          L ${cornerStartWidth} ${height}
          L ${width / 2 - cornerSize / 2} ${height}`,
          `M ${width} ${height / 2 - cornerSize / 2} 
          L ${width} ${cornerStartHeight} 
          L ${cornerEndWidth} 0
          L ${width / 2 + cornerSize / 2} 0`,
          `M ${width} ${height / 2 + cornerSize / 2}
          L ${width} ${cornerEndHeight} 
          L ${cornerEndWidth} ${height}
          L ${width / 2 + cornerSize / 2} ${height}`,
        ].map((d, i) => {
          return (
            <motion.path
              d={d}
              className="stroke-stone-700"
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

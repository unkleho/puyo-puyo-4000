import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import { IconButton } from './IconButton';
import { SVGBox } from './SVGBox';

type Props = {
  isActive?: boolean;
  className?: string;
  children: React.ReactNode;
  onClose: () => void;
};

export const Dialog: React.FC<Props> = ({
  isActive = true,
  className,
  children,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {isActive && (
        <>
          <motion.div
            className={['fixed inset-0 bg-black', className || ''].join(' ')}
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 0.9,
            }}
            exit={{
              opacity: 0,
            }}
          />
          <motion.article className="fixed inset-4">
            <SVGBox />

            <motion.div
              className="absolute inset-5"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
            >
              {children}
            </motion.div>

            <IconButton
              name="close"
              showBorder={false}
              className="absolute right-2 top-2"
              onClick={onClose}
            />
          </motion.article>
        </>
      )}
    </AnimatePresence>
  );
};

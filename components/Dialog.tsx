import { AnimatePresence } from 'framer-motion';
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
          <div
            className={['fixed inset-0 bg-black', className || ''].join(' ')}
          ></div>
          <article className="fixed inset-4">
            <SVGBox />

            <div className="absolute inset-5">{children}</div>

            <IconButton
              name="close"
              showBorder={false}
              className="absolute right-2 top-2"
              onClick={onClose}
            />
          </article>
        </>
      )}
    </AnimatePresence>
  );
};

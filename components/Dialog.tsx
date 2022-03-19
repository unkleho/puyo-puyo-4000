import React from 'react';
import { SVGBox } from './SVGBox';

type Props = {
  className?: string;
  children: React.ReactNode;
};

export const Dialog: React.FC<Props> = ({ className, children }) => {
  return (
    <>
      <div
        className={['fixed inset-0 bg-black', className || ''].join(' ')}
      ></div>
      <article className="fixed inset-4">
        <SVGBox />

        <div className="absolute inset-8">{children}</div>
      </article>
    </>
  );
};

import React from 'react';
import { Dialog } from './Dialog';
import { PuyoPuyoLogo } from './PuyoPuyoLogo';

type Props = {
  isActive?: boolean;
  onClose: () => void;
};

export const InfoDialog: React.FC<Props> = ({ isActive, onClose }) => {
  return (
    <Dialog onClose={onClose} isActive={isActive}>
      <div className="space-y-4 text-stone-300">
        <PuyoPuyoLogo fontSize="1.4em" />
        <p className=""></p>
        <p>
          Experimental open source Puyo Puyo clone by{' '}
          <a href="https://twitter.com/unkleho">Unkle Ho</a>.
        </p>
        <p>
          Connect four Puyos (balls) of the same colour to make them pop
          (disappear). Deceptively simple, difficult to master.
        </p>
        <p>
          Built with <a href="">React</a>, <a href="">Next JS</a>,{' '}
          <a href="">React Three Fiber</a>, <a href="">Zustand</a>,{' '}
          <a href="">Framer Motion</a> & <a href="">Tailwind</a>.
        </p>
        <p>
          Source code:
          <br />
          <a href="http://github.com/unkleho/puyo-puyo">
            github.com/unkleho/puyo-puyo
          </a>
        </p>
        <h2 className="pt-4 text-lg uppercase tracking-widest">Strategies</h2>
        <p>
          When a group of Puyos pop, it can cause other Puyos to pop. This is
          called chaining and the most important and satisfying part of Puyo
          Puyo.
        </p>

        <p>Read on the various ways to build chains:</p>
        <ul>
          <li>
            <a href="https://puyonexus.com/wiki/The_Blocking_Method">
              Blocking Method
            </a>
          </li>
          <li>
            <a href="https://puyonexus.com/wiki/Patterns_1:_Stairs">Stairs</a>
          </li>
          <li>
            <a href="https://puyonexus.com/wiki/Patterns_2:_Sandwich">
              Sandwich
            </a>
          </li>
          <li>
            <a href="https://puyonexus.com/wiki/Patterns_and_Transitions_3:_GTR_%26_More">
              GTR
            </a>
          </li>
        </ul>
      </div>
    </Dialog>
  );
};

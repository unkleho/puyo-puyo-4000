import { AnimatePresence } from 'framer-motion';
import React from 'react';
import { getPuyoPosition, Grid, useStore } from '../store/store';
import { Puyo } from './Puyo';

type Props = {
  grid: Grid;
  className?: string;
  // children: React.ReactNode;
};

const Board: React.FunctionComponent<Props> = ({ grid, className }) => {
  // const grid = useStore((store) => store.grid);
  const cellSize = useStore((store) => store.cellSize);
  const puyos = useStore((store) => store.puyos);

  console.log('render');

  return (
    <div className={['relative', className || ''].join(' ')}>
      <div className="bg-slate-800">
        {grid.map((columns, i) => {
          return (
            <div className="flex" key={i}>
              {columns.map((column, j) => {
                return (
                  <div
                    key={j}
                    className="outline-1 outline-slate-700 outline"
                    style={{
                      width: cellSize,
                      height: cellSize,
                    }}
                  ></div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="absolute top-0">
        <AnimatePresence>
          {Object.entries(puyos).map(([id, puyo]) => {
            const [column, row] = getPuyoPosition(grid, id);

            if (column !== null && row !== null) {
              return (
                <Puyo
                  id={id}
                  colour={puyo.colour}
                  cellSize={cellSize}
                  x={column * cellSize}
                  y={row * cellSize}
                  key={id}
                />
              );
            }

            return null;
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export const MemoBoard = React.memo(Board, (prevProps, nextProps) => {
  const prevGridString = prevProps.grid.join(',');
  const nextGridString = nextProps.grid.join(',');

  // console.log(prevGridString, nextGridString);

  if (prevGridString === nextGridString) {
    return true;
  }

  return false;
});

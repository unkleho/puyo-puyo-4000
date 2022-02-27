import { AnimatePresence } from 'framer-motion';
import React from 'react';
import useMeasure from 'react-use-measure';
import { getPuyoPosition, Grid, useStore } from '../store/store';
import { Puyo, PuyoType } from './Puyo';

type Props = {
  grid: Grid;
  className?: string;
};

const Board: React.FunctionComponent<Props> = ({ grid, className }) => {
  const puyos = useStore((store) => store.puyos);
  const userPuyoIds = useStore((store) => store.userPuyoIds);
  const puyoIdsToClear = useStore((store) => store.puyoIdsToClear);
  const setCellSize = useStore((store) => store.setCellSize);
  const [ref, { width }] = useMeasure();

  const cellSize = width / 6;
  React.useEffect(() => {
    setCellSize(cellSize);
  }, [cellSize, setCellSize]);

  return (
    <div
      className={['relative overflow-hidden', className || ''].join(' ')}
      ref={ref}
    >
      <div className="bg-stone-800">
        {grid
          // Hide top two rows for new puyos
          .filter((_, r) => r > 1)
          .map((columns, i) => {
            return (
              <div className="flex" key={i}>
                {columns.map((column, j) => {
                  return (
                    <div
                      key={j}
                      className="outline outline-[0.5px] outline-stone-700"
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
              // Adjust rows
              const newRow = row - 2;

              let type: PuyoType;
              if (puyoIdsToClear.find((ids) => ids.includes(id))) {
                type = 'to-clear';
              } else if (userPuyoIds.includes(id)) {
                type = 'user';
              } else {
                type = 'board';
              }

              // Hide top two rows for new puyos
              if (row > 1) {
                return (
                  <Puyo
                    id={id}
                    key={id}
                    colour={puyo.colour}
                    cellSize={cellSize}
                    x={column * cellSize}
                    y={newRow * cellSize}
                    type={type}
                  />
                );
              }
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

  if (prevGridString === nextGridString) {
    return true;
  }

  return false;
});

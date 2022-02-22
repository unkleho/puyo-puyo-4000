import { useStore } from '../store/store';
import { Puyo } from './Puyo';

type Props = {
  className?: string;
};

export const Queue: React.FC<Props> = ({ className }) => {
  const puyoIds = useStore((state) => state.nextPuyoIds);
  const puyos = useStore((state) => state.puyos);
  // const cellSize = useStore((state) => state.cellSize);

  const cellSize = 40;

  // if (isNaN(cellSize)) {
  //   return null;
  // }

  return (
    <div
      className={['relative', className || ''].join(' ')}
      style={{
        width: cellSize,
      }}
    >
      {puyoIds.map((id, index) => {
        const puyo = puyos[id];
        const gap = index >= 2 ? cellSize / 2 : 0;

        return (
          <Puyo
            id={id}
            colour={puyo.colour}
            cellSize={cellSize}
            y={index * cellSize + gap}
            key={id}
          />
        );
      })}
    </div>
  );
};

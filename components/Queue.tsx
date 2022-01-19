import { useStore } from '../store/store';
import { Puyo } from './Puyo';

export const Queue = () => {
  const puyoIds = useStore((state) => state.nextPuyoIds);
  const puyos = useStore((state) => state.puyos);
  const cellSize = useStore((state) => state.cellSize);

  return (
    <div className="relative">
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

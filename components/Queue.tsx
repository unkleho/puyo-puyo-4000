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
        // console.log(puyo);

        return (
          <Puyo
            id={id}
            colour={puyo.colour}
            // state={puyo.state}
            y={index * cellSize}
            key={id}
          />
        );
      })}
    </div>
  );
};

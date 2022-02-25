import { useStore } from '../store/store';

type ControlButtonProps = {
  className?: string;
  onTouchStart?: Function;
};

export const ControlButtons = () => {
  const movePuyos = useStore((store) => store.movePuyos);
  const rotatePuyos = useStore((store) => store.rotatePuyos);

  return (
    <div className="control-buttons gap-2">
      <ControlButton className="col-start-2" onTouchStart={() => rotatePuyos()}>
        Rotate
      </ControlButton>

      <ControlButton
        className="row-start-2"
        onTouchStart={() => movePuyos('left')}
      >
        Left
      </ControlButton>
      <ControlButton
        className="row-start-2"
        onTouchStart={() => movePuyos('down')}
      >
        Down
      </ControlButton>
      <ControlButton
        className="row-start-2"
        onTouchStart={() => movePuyos('right')}
      >
        Right
      </ControlButton>

      <style jsx>{`
        .control-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          grid-template-rows: 1fr 1fr;
        }
      `}</style>
    </div>
  );
};

const ControlButton: React.FunctionComponent<ControlButtonProps> = ({
  className,
  children,
  onTouchStart,
}) => {
  const cellSize = useStore((store) => store.cellSize);

  return (
    <button
      className={[
        'touch-manipulation bg-zinc-700 p-4 text-center',
        className || '',
      ].join(' ')}
      style={{
        borderRadius: cellSize / 2,
      }}
      onTouchStart={() => onTouchStart?.()}
    >
      {children}
    </button>
  );
};

import { useStore } from '../store/store';
import { Icon } from './Icon';

type ControlButtonProps = {
  className?: string;
  onClick?: Function;
};

export const ControlButtons = () => {
  const movePuyos = useStore((store) => store.movePuyos);
  const rotatePuyos = useStore((store) => store.rotatePuyos);

  return (
    <div className="control-buttons gap-1">
      <ControlButton
        className="col-span-3 col-start-1"
        onClick={() => rotatePuyos()}
      >
        <Icon name="rotate" />
      </ControlButton>

      <ControlButton className="row-start-2" onClick={() => movePuyos('left')}>
        <Icon name="left" />
      </ControlButton>
      <ControlButton className="row-start-2" onClick={() => movePuyos('down')}>
        <Icon name="down" />
      </ControlButton>
      <ControlButton className="row-start-2" onClick={() => movePuyos('right')}>
        <Icon name="right" />
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
  onClick,
}) => {
  const cellSize = useStore((store) => store.cellSize);

  return (
    <button
      className={[
        'flex touch-manipulation select-none items-center justify-center border border-zinc-700 bg-zinc-800 p-4 text-center active:bg-zinc-700',
        className || '',
      ].join(' ')}
      style={{
        borderRadius: cellSize / 2,
      }}
      onClick={() => {
        onClick?.();
      }}
      onTouchStart={() => {
        onClick?.();
      }}
    >
      {children}
    </button>
  );
};

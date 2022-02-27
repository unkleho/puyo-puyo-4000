import useDeviceDetect from '../hooks/use-device-detect';
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
    <div className="control-buttons gap-2">
      <ControlButton
        className="col-span-1 col-start-2"
        onClick={() => rotatePuyos()}
      >
        <Icon name="rotate" />
      </ControlButton>

      <ControlButton
        className="row-span-2 row-start-1"
        onClick={() => movePuyos('left')}
      >
        <Icon name="left" />
      </ControlButton>

      <ControlButton className="row-start-2" onClick={() => movePuyos('down')}>
        <Icon name="down" />
      </ControlButton>

      <ControlButton
        className="row-span-2 row-start-1"
        onClick={() => movePuyos('right')}
      >
        <Icon name="right" />
      </ControlButton>

      <style jsx>{`
        .control-buttons {
          display: grid;
          grid-template-columns: 1fr 2fr 1fr;
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
  // const cellSize = useStore((store) => store.cellSize);
  const isMobile = useDeviceDetect();

  return (
    <button
      className={[
        'flex touch-manipulation select-none items-center justify-center border-t  border-stone-700 bg-stone-900 p-4 text-center active:bg-stone-700',
        className || '',
      ].join(' ')}
      // style={{
      //   borderRadius: cellSize / 2,
      // }}
      onClick={() => {
        if (!isMobile) {
          onClick?.();
        }
      }}
      onTouchStart={() => {
        onClick?.();
      }}
    >
      {children}
    </button>
  );
};

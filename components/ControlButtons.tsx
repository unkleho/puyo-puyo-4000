import React from 'react';
import useDeviceDetect from '../hooks/use-device-detect';
import { useStore } from '../store/store';
import { Icon } from './Icon';
import { Borders, SciFiBox } from './SciFiBox';

type Props = {
  className?: string;
};

type ControlButtonProps = {
  title: string;
  borders?: Borders;
  className?: string;
  onClick?: Function;
};

export const ControlButtons: React.FC<Props> = ({ className }) => {
  const movePuyos = useStore((store) => store.movePuyos);
  const rotatePuyos = useStore((store) => store.rotatePuyos);

  return (
    <div className={['control-buttons gap-2', className || ''].join(' ')}>
      <div className="col-span-1 col-start-2 flex">
        <ControlButton
          title="Rotate Anti-clockwise"
          borders={{
            topLeft: 'top',
            bottom: 'hide',
            left: 'hide',
            bottomLeft: 'hide',
            right: 'hide',
            bottomRight: 'hide',
          }}
          className="flex-1"
          onClick={() => rotatePuyos('ccw')}
        >
          {/* Same glyph as the clockwise icon, mirrored — there's no
          separate anti-clockwise artwork in the icon sprite. */}
          <Icon name="rotate" className="-scale-x-100" />
        </ControlButton>

        <ControlButton
          title="Rotate Clockwise"
          borders={{
            topRight: 'top',
            bottom: 'hide',
            left: 'hide',
            bottomLeft: 'hide',
            right: 'hide',
            bottomRight: 'hide',
          }}
          className="flex-1"
          onClick={() => rotatePuyos('cw')}
        >
          <Icon name="rotate" />
        </ControlButton>
      </div>

      <ControlButton
        title="Left"
        borders={{
          topRight: 'top',
          right: 'hide',
          bottomRight: 'bottom',
          left: 'hide',
        }}
        className="row-span-2 row-start-1 border-b-0"
        onClick={() => movePuyos('left')}
      >
        <Icon name="left" />
      </ControlButton>

      <ControlButton
        title="Down"
        borders={{
          topRight: 'top',
          topLeft: 'top',
          left: 'hide',
          bottomLeft: 'bottom',
          right: 'hide',
          bottomRight: 'bottom',
        }}
        className="row-start-2"
        onClick={() => movePuyos('down')}
      >
        <Icon name="down" />
      </ControlButton>

      <ControlButton
        title="Right"
        borders={{
          topLeft: 'top',
          left: 'hide',
          right: 'hide',
          bottomLeft: 'bottom',
        }}
        className="row-span-2 row-start-1 border-b-0"
        onClick={() => movePuyos('right')}
      >
        <Icon name="right" />
      </ControlButton>

      <style jsx>{`
        .control-buttons {
          display: grid;
          grid-template-columns: 2fr 5fr 2fr;
          grid-template-rows: 1fr 1fr;
        }
      `}</style>
    </div>
  );
};

const ControlButton: React.FunctionComponent<ControlButtonProps> = ({
  title,
  className,
  borders,
  children,
  onClick,
}) => {
  const { isMobile } = useDeviceDetect();

  return (
    <button
      className={[
        'relative flex touch-manipulation select-none items-center justify-center border-0  border-stone-700 bg-stone-900 p-4 text-center active:bg-stone-700',
        className || '',
      ].join(' ')}
      title={title}
      onClick={() => {
        if (!isMobile) {
          onClick?.();
        }
      }}
      onTouchStart={() => {
        onClick?.();
      }}
    >
      <SciFiBox className="absolute inset-0" borders={borders} />
      {children}
    </button>
  );
};

export type IconName =
  | 'close'
  | 'down'
  | 'left'
  | 'menu'
  | 'play'
  | 'pause'
  | 'return-up-back'
  | 'right'
  | 'rotate'
  | 'volume-high'
  | 'volume-off';

type Props = {
  name: IconName;
  size?: 'sm' | 'base';
  className?: string;
};

export const Icon: React.FC<Props> = ({ name, size = 'base', className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={[
        'text-stone-300',
        size === 'base' ? 'w-8' : '',
        size === 'sm' ? 'w-6' : '',
        className || '',
      ].join(' ')}
      aria-label={name}
    >
      <use xlinkHref={'/icons/icons.svg#' + name}></use>
    </svg>
  );
};

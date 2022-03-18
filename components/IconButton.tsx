import { Icon, IconName } from './Icon';

type Props = {
  name: IconName;
  className?: string;
  onClick: () => void;
};

export const IconButton: React.FC<Props> = ({ name, className, onClick }) => {
  return (
    <button
      onClick={onClick}
      aria-label={name}
      className={[
        'flex h-12 w-12 items-center justify-center border border-stone-700 uppercase',
        className || '',
      ].join(' ')}
    >
      <Icon name={name} />
    </button>
  );
};

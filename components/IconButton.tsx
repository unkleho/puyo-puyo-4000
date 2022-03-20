import { Icon, IconName } from './Icon';

type Props = {
  name: IconName;
  showBorder?: boolean;
  className?: string;
  onClick: () => void;
};

export const IconButton: React.FC<Props> = ({
  name,
  showBorder = true,
  className,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      aria-label={name}
      className={[
        'flex h-12 w-12 items-center justify-center uppercase',
        showBorder ? 'border border-stone-700' : '',
        className || '',
      ].join(' ')}
    >
      <Icon name={name} size="sm" />
    </button>
  );
};

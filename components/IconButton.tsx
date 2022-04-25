import { motion } from 'framer-motion';
import { Icon, IconName } from './Icon';

type Props = {
  name: IconName;
  showBorder?: boolean;
  className?: string;
  onClick: () => void;
};

export const IconButton: React.FC<Props> = ({
  name,
  showBorder = false,
  className,
  onClick,
}) => {
  return (
    <motion.button
      onClick={onClick}
      aria-label={name}
      className={[
        'flex h-12 w-12 items-center justify-center uppercase',
        showBorder ? 'border border-stone-700' : '',
        className || '',
      ].join(' ')}
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
    >
      <Icon
        name={name}
        size="sm"
        className="transition-colors hover:text-fuchsia-600"
      />
    </motion.button>
  );
};

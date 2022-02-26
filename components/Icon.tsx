type Props = {
  name: 'left' | 'right' | 'down' | 'rotate';
};

export const Icon: React.FC<Props> = ({ name }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className="w-8"
    >
      <use xlinkHref={'/icons/icons.svg#' + name}></use>
    </svg>
  );
};

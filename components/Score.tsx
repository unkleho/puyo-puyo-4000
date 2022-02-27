import { CountUp } from 'use-count-up';
import { usePrevious } from '../hooks/use-previous';

type Props = {
  score: number;
};

export const Score: React.FC<Props> = ({ score }) => {
  const prevScore = usePrevious(score);

  return (
    <CountUp isCounting={true} start={prevScore} end={score} key={score} />
  );
};

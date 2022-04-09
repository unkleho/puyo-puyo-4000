import { useEffect, useState } from 'react';
import { Instrument, Song, Track } from 'reactronica';
import { usePrevious } from '../hooks/use-previous';
import { useStore } from '../store/store';

// TODO: Export NoteType from Reactronica

/** Sounds from https://github.com/rse/soundfx */
export const Audio = () => {
  const gameState = useStore((store) => store.gameState);
  const score = useStore((store) => store.score);
  const prevScore = usePrevious(score);

  const [notes, setNotes] = useState<{ name: string; key?: string }[]>([]);

  // console.log(gameState, score, prevScore);

  useEffect(() => {
    if (gameState === 'start') {
      setNotes([{ name: 'C3' }]);
    } else if (gameState === 'landed-puyos') {
      // setNotes([{ name: 'D3', key: Math.random().toString() }]);
    } else if (gameState === 'collapse-puyos') {
      if (score !== prevScore) {
        setNotes([{ name: 'E3', key: Math.random().toString() }]);
      } else {
        // setNotes([{ name: 'G3', key: Math.random().toString() }]);
      }
    } else if (gameState === 'lose') {
      setNotes([{ name: 'F3', key: Math.random().toString() }]);
    } else if (gameState === 'landing-puyos') {
      setNotes([{ name: 'G3', key: Math.random().toString() }]);
    }
  }, [gameState, score, prevScore]);

  return (
    <Song>
      <Track>
        <Instrument
          type="sampler"
          notes={notes}
          samples={{
            C3: './audio/bling5.mp3', // Start
            D3: './audio/beep6.mp3', // Landed
            E3: './audio/bling1.mp3', // Collapsed
            F3: './audio/error2.mp3', // Lose
            G3: './audio/beep2.mp3', // Landing
          }}
        ></Instrument>
      </Track>
    </Song>
  );
};

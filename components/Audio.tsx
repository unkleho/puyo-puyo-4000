import { useEffect, useState } from 'react';
import { Instrument, Song, Track } from 'reactronica';
import { usePrevious } from '../hooks/use-previous';
import { useStore } from '../store/store';
import { collapsePuyosTimeout } from './Game';

// TODO: Export NoteType from Reactronica

/** Sounds from https://github.com/rse/soundfx */
export const Audio = () => {
  const gameState = useStore((store) => store.gameState);

  const score = useStore((store) => store.score);
  const prevScore = usePrevious(score);

  const puyoRotation = useStore((store) => store.puyoRotation);
  const prevPuyoRotation = usePrevious(puyoRotation);

  const puyoMoveType = useStore((store) => store.puyoMoveType);
  const prevPuyoMoveType = usePrevious(puyoMoveType);

  const [notes, setNotes] = useState<
    { name: string; key?: string; velocity?: number }[]
  >([]);

  console.log(gameState, score, prevScore, puyoMoveType);

  // useEffect(() => {
  //   if (gameState !== 'idle' && prevPuyoMoveType !== puyoMoveType) {
  //     setNotes([{ name: 'B4', key: Math.random().toString(), velocity: 0.5 }]);
  //   }
  // }, [gameState, puyoMoveType, prevPuyoMoveType]);

  useEffect(() => {
    if (gameState !== 'idle' && prevPuyoRotation !== puyoRotation) {
      setNotes([{ name: 'B4', key: Math.random().toString(), velocity: 0.5 }]);
    }

    if (gameState === 'start') {
      setNotes([{ name: 'C3' }]);
    } else if (gameState === 'landed-puyos') {
      // setNotes([{ name: 'D3', key: Math.random().toString() }]);
    } else if (gameState === 'collapse-puyos') {
      if (score !== prevScore) {
        setNotes([{ name: 'E3', key: Math.random().toString() }]);
      } else {
        window.setTimeout(() => {
          setNotes([{ name: 'A4', key: Math.random().toString() }]);
        }, collapsePuyosTimeout);
      }
    } else if (gameState === 'lose') {
      setNotes([{ name: 'F3', key: Math.random().toString() }]);
    } else if (gameState === 'landing-puyos') {
      // Or G3?
      setNotes([{ name: 'D3', key: Math.random().toString() }]);
    }
  }, [gameState, score, prevScore, puyoRotation, prevPuyoRotation]);

  return (
    <Song>
      <Track>
        <Instrument
          type="sampler"
          notes={notes}
          samples={{
            // C3: './audio/bling5.mp3', // Start
            C3: './audio/error3.mp3', // Start
            D3: './audio/beep6.mp3', // Landed
            E3: './audio/bling1.mp3', // Collapsed (chain)
            F3: './audio/error2.mp3', // Lose
            G3: './audio/beep2.mp3', // Landing
            A4: './audio/beep4.mp3', // Collapse (no chain)
            B4: './audio/slide3.mp3', // Collapse (no chain)
            C4: './audio/slide2.mp3', // Move puyo down
          }}
        ></Instrument>
      </Track>
    </Song>
  );
};

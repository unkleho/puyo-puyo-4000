import { useEffect, useState } from 'react';
import { Instrument, Song, Track } from 'reactronica';
import { usePrevious } from '../hooks/use-previous';
import { useAudioStore } from '../store/audioStore';
import { getPuyoPosition, useStore } from '../store/store';
import { collapsePuyosTimeout } from './Game';

// TODO: Export NoteType from Reactronica

/** Sounds from https://github.com/rse/soundfx */
export const Audio = () => {
  const gameState = useStore((store) => store.gameState);

  const grid = useStore((store) => store.grid);
  const userPuyoIds = useStore((store) => store.userPuyoIds);

  const [puyo1Id] = userPuyoIds;
  const [puyo1Column] = getPuyoPosition(grid, puyo1Id);
  const prevPuyo1Column = usePrevious(puyo1Column);

  const score = useStore((store) => store.score);
  const prevScore = usePrevious(score);

  const puyoRotation = useStore((store) => store.puyoRotation);
  const prevPuyoRotation = usePrevious(puyoRotation);

  const puyoMoveType = useStore((store) => store.puyoMoveType);
  const puyoMoveDirection = useStore((store) => store.puyoMoveDirection);

  const volume = useAudioStore((store) => store.volume);

  const [notes, setNotes] = useState<
    { name: string; key?: string; velocity?: number }[]
  >([]);

  // console.log(gameState, puyoMoveType, puyoMoveDirection, puyoRotation);
  console.log(gameState, prevPuyoRotation, puyoRotation);

  useEffect(() => {
    if (
      gameState == 'drop-puyos' &&
      puyoMoveType === 'user' &&
      puyoMoveDirection == 'down'
    ) {
      // Down sound
      setNotes([{ name: 'C4', key: Math.random().toString(), velocity: 0.2 }]);
    }
  }, [gameState, puyoMoveType, puyoMoveDirection]);

  useEffect(() => {
    if (
      gameState !== 'idle' &&
      puyoMoveType === 'user' &&
      (puyoMoveDirection == 'left' || puyoMoveDirection == 'right') &&
      puyo1Column !== prevPuyo1Column
    ) {
      // Left / Right sound
      setNotes([{ name: 'D4', key: Math.random().toString(), velocity: 0.5 }]);
    }
  }, [
    gameState,
    puyoMoveType,
    puyoMoveDirection,
    puyo1Column,
    prevPuyo1Column,
  ]);

  useEffect(() => {
    if (gameState !== 'idle' && prevPuyoRotation !== puyoRotation) {
      // Rotate sound
      setNotes([{ name: 'B4', key: Math.random().toString(), velocity: 0.2 }]);
    }
  }, [gameState, puyoRotation, prevPuyoRotation]);

  useEffect(() => {
    if (gameState === 'start') {
      setNotes([{ name: 'C3' }]);
    } else if (gameState === 'landed-puyos') {
      // setNotes([{ name: 'D3', key: Math.random().toString() }]);
    } else if (gameState === 'collapse-puyos') {
      if (score !== prevScore) {
        setNotes([{ name: 'E3', key: Math.random().toString() }]);
      } else {
        window.setTimeout(() => {
          setNotes([
            { name: 'A3', key: Math.random().toString(), velocity: 0.5 },
          ]);
        }, collapsePuyosTimeout);
      }
    } else if (gameState === 'lose') {
      setNotes([{ name: 'F3', key: Math.random().toString() }]);
    } else if (gameState === 'landing-puyos') {
      // Or G3?
      setNotes([{ name: 'D3', key: Math.random().toString() }]);
    }
  }, [gameState, score, prevScore]);

  return (
    <Song isMuted={volume === 'off'}>
      <Track>
        <Instrument
          type="sampler"
          notes={notes}
          onLoad={(buffers) => {
            console.log(buffers);
          }}
          samples={{
            // C3: './audio/bling5.mp3', // Start
            C3: '/audio/beep3.mp3', // Start
            D3: '/audio/beep6.mp3', // Landed
            E3: '/audio/bling1.mp3', // Collapsed (chain)
            F3: '/audio/error2.mp3', // Lose
            G3: '/audio/beep2.mp3', // Landing
            A3: '/audio/beep4.mp3', // Collapse (no chain)
            B4: '/audio/slide3.mp3', // Move down
            C4: '/audio/slide2.mp3', // Rotate
            D4: '/audio/click4.mp3', // Move puyo left/right
          }}
        ></Instrument>
      </Track>
    </Song>
  );
};

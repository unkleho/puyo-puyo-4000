import type { NextPage } from 'next';
import React, { useEffect } from 'react';
import { MemoBoard as Board } from '../components/Board';
import { Queue } from '../components/Queue';
import { useKeyPress } from '../hooks/use-key-press';
import { useStore } from '../store/store';

const collapsePuyosTimeout = 200;
const clearPuyosTimeout = 200;

const Home: NextPage = () => {
  const grid = useStore((store) => store.grid);
  const gameState = useStore((store) => store.gameState);
  const tickSpeed = useStore((store) => store.tickSpeed);

  const startGame = useStore((store) => store.startGame);
  const togglePauseGame = useStore((store) => store.togglePauseGame);
  const movePuyos = useStore((store) => store.movePuyos);
  const rotatePuyos = useStore((store) => store.rotatePuyos);
  const addPuyos = useStore((store) => store.addPuyos);
  const landedPuyos = useStore((store) => store.landedPuyos);
  const clearPuyos = useStore((store) => store.clearPuyos);
  const collapsePuyos = useStore((store) => store.collapsePuyos);
  const loseGame = useStore((store) => store.loseGame);

  useKeyPress('ArrowLeft', () => {
    movePuyos('left');
  });

  useKeyPress('ArrowRight', () => {
    movePuyos('right');
  });

  useKeyPress('ArrowUp', () => {
    rotatePuyos();
  });

  useKeyPress('ArrowDown', () => {
    movePuyos('down');
  });

  useEffect(() => {
    let interval: number = 0;

    if (gameState === 'start') {
      addPuyos();
    } else if (gameState === 'drop-puyos') {
      interval = window.setInterval(() => {
        movePuyos('down');
      }, tickSpeed);
    } else if (gameState === 'paused') {
      window.clearInterval(interval);
    } else if (gameState === 'landed-puyos') {
      window.clearInterval(interval);
      landedPuyos();
    } else if (gameState === 'collapse-puyos') {
      window.setTimeout(() => {
        collapsePuyos();
      }, collapsePuyosTimeout);
    } else if (gameState === 'clear-puyos') {
      window.setTimeout(() => {
        clearPuyos();
      }, clearPuyosTimeout);
    } else if (gameState === 'add-puyos') {
      addPuyos();
    } else if (gameState === 'lose') {
      loseGame();
    }

    return () => {
      window.clearInterval(interval);
    };
  }, [
    gameState,
    tickSpeed,
    movePuyos,
    addPuyos,
    landedPuyos,
    clearPuyos,
    collapsePuyos,
    loseGame,
  ]);

  console.log(gameState);

  return (
    <main className={'grid place-content-center h-full bg-slate-800'}>
      <div className="flex mb-4">
        <Board grid={grid} className="mr-4"></Board>

        <Queue />
      </div>
      <button onClick={() => startGame()}>Start</button>
      <button onClick={() => togglePauseGame()}>Pause</button>

      <p className="mt-4 uppercase text-sm">{gameState}</p>
      <p className="uppercase text-sm">{tickSpeed}</p>
    </main>
  );
};

export default Home;

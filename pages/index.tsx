import type { NextPage } from 'next';
import React, { useEffect } from 'react';
import useMeasure from 'react-use-measure';
import { MemoBoard as Board } from '../components/Board';
import { ControlButtons } from '../components/ControlButtons';
import { Queue } from '../components/Queue';
import { ThreeBoard } from '../components/ThreeBoard';
import { ThreeQueue } from '../components/ThreeQueue';
import { useKeyPress } from '../hooks/use-key-press';
import { useWindowSize } from '../hooks/use-window-size';
import { useStore } from '../store/store';

const collapsePuyosTimeout = 300;
const clearPuyosTimeout = 300;
const landingPuyosTimeout = 300;

const Home: NextPage = () => {
  const grid = useStore((store) => store.grid);
  const gameState = useStore((store) => store.gameState);
  const tickSpeed = useStore((store) => store.tickSpeed);
  const score = useStore((store) => store.score);
  const chainCount = useStore((store) => store.chainCount);
  const cellSize = useStore((store) => store.cellSize);
  const setCellSize = useStore((store) => store.setCellSize);
  const setScreen = useStore((store) => store.setScreen);

  const startGame = useStore((store) => store.startGame);
  const togglePauseGame = useStore((store) => store.togglePauseGame);
  const movePuyos = useStore((store) => store.movePuyos);
  const rotatePuyos = useStore((store) => store.rotatePuyos);
  const addPuyos = useStore((store) => store.addPuyos);
  const landingPuyos = useStore((store) => store.landingPuyos);
  const landedPuyos = useStore((store) => store.landedPuyos);
  const clearPuyos = useStore((store) => store.clearPuyos);
  const collapsePuyos = useStore((store) => store.collapsePuyos);
  const loseGame = useStore((store) => store.loseGame);

  const windowSize = useWindowSize();

  // const [ref, { width, height }] = useMeasure();

  useEffect(() => {
    if (windowSize.width && windowSize.height) {
      setScreen(windowSize.width, windowSize.height);
    }
  }, [windowSize.width, windowSize.height, setScreen]);

  // console.log('main', width, height);

  // Allow space for gaps and borders
  // const boardGap = 4;
  // const gridGap = 0;
  // const totalGap = boardGap * 4 + gridGap;
  // const cellSize = (width - totalGap) / 7;
  // React.useEffect(() => {
  //   setCellSize(cellSize);
  // }, [cellSize]);
  // console.log({ width });

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
    } else if (gameState === 'landing-puyos') {
      window.setTimeout(() => {
        landingPuyos();
      }, landingPuyosTimeout);
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
    landingPuyos,
    landedPuyos,
    clearPuyos,
    collapsePuyos,
    loseGame,
  ]);

  // console.log(gameState);

  return (
    <main className={'h-full bg-stone-900 p-4'}>
      <div className="game h-full gap-4">
        <div className="flex justify-center">
          <div className="h-full overflow-hidden border border-stone-700">
            <ThreeBoard grid={grid} className="board" />
          </div>

          {/* <Board grid={grid} className=""></Board> */}

          <div className="ml-4 flex flex-col justify-between">
            {/* <Queue /> */}
            <ThreeQueue className="border-t border-b border-stone-700" />

            <div className="flex flex-col">
              {gameState === 'idle' ||
              gameState === 'paused' ||
              gameState === 'lose' ? (
                <button
                  onClick={() => startGame()}
                  className="uppercase tracking-wider"
                >
                  Play
                </button>
              ) : (
                <button onClick={() => togglePauseGame()} className="uppercase">
                  Pause
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mb-1">
          <p className="text-center text-xl font-extrabold uppercase leading-none tracking-wider">
            {score}
          </p>
        </div>

        <ControlButtons />
      </div>

      {/* 
      <p className="text-sm uppercase">{gameState}</p>
      <p className="text-sm uppercase">{tickSpeed}</p>
      <p className="text-sm uppercase">{chainCount}</p> */}

      <style jsx>{`
        .game {
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: 1fr auto;
        }

        .board {
        }
      `}</style>
    </main>
  );
};

export default Home;

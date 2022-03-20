import type { NextPage } from 'next';
import React, { useEffect, useRef, useState } from 'react';
import { Alert } from '../components/Alert';
// import { MemoBoard as Board } from '../components/Board';
import { IconButton } from '../components/IconButton';
import { ControlButtons } from '../components/ControlButtons';
import { Icon } from '../components/Icon';
import { Score } from '../components/Score';
// import { Queue } from '../components/Queue';
import { ThreeBoard } from '../components/ThreeBoard';
import { ThreeQueue } from '../components/ThreeQueue';
import { useKeyPress } from '../hooks/use-key-press';
import { useWindowSize } from '../hooks/use-window-size';
import { useStore } from '../store/store';
import { Dialog } from '../components/Dialog';

const collapsePuyosTimeout = 400;
const clearPuyosTimeout = 400;
const landingPuyosTimeout = 300;

const localWindow = typeof window === 'undefined' ? null : window;

const Home: NextPage = () => {
  const grid = useStore((store) => store.grid);
  const gameState = useStore((store) => store.gameState);
  const tickSpeed = useStore((store) => store.tickSpeed);
  const score = useStore((store) => store.score);
  const totalChainCount = useStore((store) => store.totalChainCount);
  const level = useStore((store) => store.level);

  const setScreen = useStore((store) => store.setScreen);
  const setPadding = useStore((store) => store.setPadding);

  const startGame = useStore((store) => store.startGame);
  const togglePauseGame = useStore((store) => store.togglePauseGame);
  const loseGame = useStore((store) => store.loseGame);
  const idleGame = useStore((store) => store.idleGame);

  const movePuyos = useStore((store) => store.movePuyos);
  const rotatePuyos = useStore((store) => store.rotatePuyos);
  const addPuyos = useStore((store) => store.addPuyos);
  const landingPuyos = useStore((store) => store.landingPuyos);
  const landedPuyos = useStore((store) => store.landedPuyos);
  const clearPuyos = useStore((store) => store.clearPuyos);
  const collapsePuyos = useStore((store) => store.collapsePuyos);

  const [isDialogOpen, setDialogOpen] = useState(false);

  // Measure padding on <main> to use set ThreeBoard canvas width/height
  const mainRef = useRef<HTMLDivElement>(null);
  const mainComputedStyle = mainRef.current
    ? localWindow?.getComputedStyle(mainRef.current as Element)
    : null;
  const mainPaddingPx = mainComputedStyle?.padding;

  useEffect(() => {
    if (mainPaddingPx) {
      const mainPadding = parseInt(mainPaddingPx.replace('px', ''));
      setPadding(mainPadding);
    }
  }, [mainPaddingPx, setPadding]);

  const windowSize = useWindowSize();
  // iPhone Mini Viewport 375 x 610

  useEffect(() => {
    if (windowSize.width && windowSize.height) {
      setScreen(windowSize.width, windowSize.height);
    }
  }, [windowSize.width, windowSize.height, setScreen]);

  useKeyPress(' ', [gameState], () => {
    if (gameState === 'idle') {
      startGame();
    }
  });

  useKeyPress('ArrowLeft', [gameState], () => {
    if (gameState !== 'paused') {
      movePuyos('left');
    }
  });

  useKeyPress('ArrowRight', [gameState], () => {
    if (gameState !== 'paused') {
      movePuyos('right');
    }
  });

  useKeyPress('ArrowUp', [gameState], () => {
    if (gameState !== 'paused') {
      rotatePuyos();
    }
  });

  useKeyPress('ArrowDown', [gameState], () => {
    if (gameState !== 'paused') {
      movePuyos('down');
    }
  });

  useEffect(() => {
    let interval: number = 0;

    if (gameState === 'start') {
      addPuyos();
    } else if (gameState === 'drop-puyos') {
      interval = window.setInterval(() => {
        movePuyos('down', 'board');
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

  return (
    <>
      <main
        className={'h-full bg-stone-900 p-4 md:flex md:justify-center md:p-8'}
        ref={mainRef}
      >
        <div className="game h-full gap-4">
          <div className="flex w-12 flex-col">
            <h1
              className="mt-[-0.2em] ml-[-0.1em] uppercase leading-none tracking-widest"
              style={{
                fontSize: '1.15em',
              }}
            >
              Puyo Puyo{' '}
              <span className="mr-[-0.2em] mt-[-0.1em] block text-left text-xs text-stone-500">
                4000
              </span>
            </h1>

            <IconButton
              name="menu"
              className="mt-4"
              onClick={() => setDialogOpen(true)}
            />

            <p
              className="mt-auto flex text-right font-normal uppercase leading-none tracking-widest"
              style={{
                writingMode: 'vertical-lr',
              }}
            >
              <span className="inline-block translate-x-[-0.1em] text-xs leading-none text-stone-500">
                Score
              </span>
              <span
                className="mb-0 inline-block translate-x-[-0.14em] text-3xl font-semibold tabular-nums leading-none"
                style={{
                  minHeight: '7rem',
                }}
              >
                <Score score={score} />
              </span>
            </p>
          </div>

          <div className="relative flex h-full justify-center overflow-hidden">
            <ThreeBoard grid={grid} className="board mt-auto overflow-hidden" />
            {/* <Board grid={grid} className="" /> */}

            <Alert onClick={() => startGame()} isActive={gameState === 'idle'}>
              Start
            </Alert>
            <Alert onClick={() => startGame()} isActive={gameState === 'lose'}>
              Play again
            </Alert>
          </div>

          <div className="flex w-12 flex-col justify-between">
            <ThreeQueue className="mr-4 border-t border-b border-stone-700" />
            {/* <Queue /> */}

            <div className="mb-auto mt-2 text-left">
              <p className="text-xs uppercase tracking-widest text-stone-500">
                Lvl
              </p>
              <p className="mb-1 text-lg font-bold uppercase tracking-widest">
                {level}
              </p>
              <p className="text-xs uppercase tracking-widest text-stone-500">
                Chns
              </p>
              <p className="text-lg font-bold uppercase tracking-widest">
                {totalChainCount}
              </p>
            </div>

            <div className="flex flex-col space-y-4">
              {gameState !== 'idle' && (
                <IconButton
                  name="return-up-back"
                  onClick={() => {
                    idleGame();
                  }}
                  className=""
                ></IconButton>
              )}

              {gameState === 'idle' ||
              gameState === 'paused' ||
              gameState === 'lose' ? (
                <IconButton
                  name="play"
                  onClick={() => {
                    if (gameState === 'paused') {
                      togglePauseGame();
                    } else {
                      startGame();
                    }
                  }}
                  className=""
                ></IconButton>
              ) : (
                <IconButton
                  name="pause"
                  onClick={() => togglePauseGame()}
                  className="uppercase"
                >
                  <Icon name="pause" />
                </IconButton>
              )}
            </div>
          </div>

          <ControlButtons className="col-span-3" />
        </div>

        {/* 
      <p className="text-sm uppercase">{gameState}</p>
      <p className="text-sm uppercase">{totalChainCount}</p> */}

        <style jsx>{`
          .game {
            display: grid;
            grid-template-columns: auto 1fr auto;
            grid-template-rows: auto 1fr;
          }
        `}</style>
      </main>

      <Dialog onClose={() => setDialogOpen(false)} isActive={isDialogOpen}>
        <div className="space-y-4 uppercase tracking-widest">
          <h1 className="text-xl uppercase tracking-widest">Puyo Puyo 4000</h1>
          <p>By Unkle Ho</p>
          <p>Open source Puyo Puyo clone</p>
          <p>
            Built with React, Next JS, React Three Fiber, Zustand & Framer
            Motion.
          </p>
          <p>github.com/unkleho/puyo-puyo</p>
        </div>
      </Dialog>
    </>
  );
};

export default Home;

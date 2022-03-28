import { useEffect } from 'react';
import { useKeyPress } from '../hooks/use-key-press';
import { useStore } from '../store/store';
import { Alert } from './Alert';
import { ControlButtons } from './ControlButtons';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { PuyoPuyoLogo } from './PuyoPuyoLogo';
import { Score } from './Score';
import { ThreeBoard } from './ThreeBoard';
import { ThreeQueue } from './ThreeQueue';

const collapsePuyosTimeout = 400;
const clearPuyosTimeout = 400;
const landingPuyosTimeout = 300;

export const Game = () => {
  const grid = useStore((store) => store.grid);
  const localGameState = useStore((store) => store.gameState);
  const tickSpeed = useStore((store) => store.tickSpeed);
  const score = useStore((store) => store.score);
  const totalChainCount = useStore((store) => store.totalChainCount);
  const level = useStore((store) => store.level);
  const isDialogOpen = useStore((store) => store.isDialogOpen);

  const setDialogOpen = useStore((store) => store.setDialogOpen);

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

  const gameState = isDialogOpen ? localGameState === 'paused' : localGameState;

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
    <div className="game h-full gap-4">
      <div className="flex w-12 flex-col">
        <PuyoPuyoLogo />

        <IconButton
          name="menu"
          className="mt-1"
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

      <style jsx>{`
        .game {
          display: grid;
          grid-template-columns: auto 1fr auto;
          grid-template-rows: auto 1fr;
        }
      `}</style>
    </div>
  );
};

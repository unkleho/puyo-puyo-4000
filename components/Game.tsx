import { useEffect, useState } from 'react';
import { useKeyPress } from '../hooks/use-key-press';
import { useAudioStore } from '../store/audioStore';
import { useStore } from '../store/store';
import { Alert } from './Alert';
import { Audio } from './Audio';
import { ControlButtons } from './ControlButtons';
import { IconButton } from './IconButton';
import { PuyoPuyoLogo } from './PuyoPuyoLogo';
import { Score } from './Score';
import { ThreeBoard } from './ThreeBoard';
import { ThreeQueue } from './ThreeQueue';

export const COLLAPSE_PUYOS_TIMEOUT = 400;
const CLEAR_PUYOS_TIMEOUT = 400;
const LANDING_PUYOS_TIMEOUT = 300;

export const Game = () => {
  const grid = useStore((store) => store.grid);
  const localGameState = useStore((store) => store.gameState);
  const tickSpeed = useStore((store) => store.tickSpeed);
  const score = useStore((store) => store.score);
  const totalChainCount = useStore((store) => store.totalChainCount);
  const level = useStore((store) => store.level);
  const isDialogOpen = useStore((store) => store.isDialogOpen);
  const volume = useAudioStore((store) => store.volume);

  const setDialogOpen = useStore((store) => store.setDialogOpen);
  const setVolume = useAudioStore((store) => store.setVolume);

  const startGame = useStore((store) => store.startGame);
  const dropPuyos = useStore((store) => store.dropPuyos);
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

  // --------------------------------------------------------------------------
  // SSR check
  // --------------------------------------------------------------------------
  useEffect(() => {
    setIsSSR(false);
  }, []);

  // --------------------------------------------------------------------------
  // Keyboard controls
  // --------------------------------------------------------------------------
  useKeyPress(' ', [gameState], () => {
    if (gameState === 'idle') {
      startGame();
    }
  });

  useKeyPress('ArrowLeft', [gameState], () => {
    if (gameState !== 'paused' && gameState !== 'lose') {
      movePuyos('left');
    }
  });

  useKeyPress('ArrowRight', [gameState], () => {
    if (gameState !== 'paused' && gameState !== 'lose') {
      movePuyos('right');
    }
  });

  useKeyPress('ArrowUp', [gameState], () => {
    if (gameState !== 'paused' && gameState !== 'lose') {
      rotatePuyos();
    }
  });

  useKeyPress('ArrowDown', [gameState], () => {
    if (gameState !== 'paused' && gameState !== 'lose') {
      movePuyos('down');
    }
  });

  const [isSSR, setIsSSR] = useState(true);

  // --------------------------------------------------------------------------
  // Game state effects
  // --------------------------------------------------------------------------
  useEffect(() => {
    let interval: number = 0;

    if (gameState === 'start') {
      dropPuyos();
    } else if (gameState === 'drop-puyos') {
      interval = window.setInterval(() => {
        movePuyos('down', 'board');
      }, tickSpeed);
    } else if (gameState === 'paused') {
      window.clearInterval(interval);
    } else if (gameState === 'landing-puyos') {
      window.setTimeout(() => {
        landingPuyos();
      }, LANDING_PUYOS_TIMEOUT);
    } else if (gameState === 'landed-puyos') {
      window.clearInterval(interval);
      landedPuyos();
    } else if (gameState === 'collapse-puyos') {
      window.setTimeout(() => {
        collapsePuyos();
      }, COLLAPSE_PUYOS_TIMEOUT);
    } else if (gameState === 'clear-puyos') {
      window.setTimeout(() => {
        clearPuyos();
      }, CLEAR_PUYOS_TIMEOUT);
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
    dropPuyos,
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

        {!isSSR && (
          <IconButton
            name={`volume-${volume}`}
            onClick={() => {
              setVolume(volume);
            }}
          ></IconButton>
        )}

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
        <ThreeQueue className="mr-4" />
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
            ></IconButton>
          )}
        </div>
      </div>

      <ControlButtons className="col-span-3" />

      <Audio />

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

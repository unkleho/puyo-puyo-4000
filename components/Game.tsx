import { useEffect, useRef, useState } from 'react';
import { useKeyPress } from '../hooks/use-key-press';
import { useSessionStorage } from '../hooks/use-storage';
import { useAudioStore } from '../store/audioStore';
import { GameSnapshot, GameState, useStore } from '../store/store';
import { Alert } from './Alert';
import { Audio } from './Audio';
import { ControlButtons } from './ControlButtons';
import { IconButton } from './IconButton';
import {
  CLEAR_TO_COLLAPSE_PAUSE_SECONDS,
  getFallAnimationDurationSeconds,
  getSinkAnimationDurationSeconds,
} from './PuyoMetaballs';
import { PuyoPuyoLogo } from './PuyoPuyoLogo';
import { Score } from './Score';
import { ThreeBoard } from './ThreeBoard';
import { ThreeQueue } from './ThreeQueue';

// Used when entering collapse-puyos with nothing just cleared (the active
// piece landed unsupported) — there's no exit animation to wait for, just a
// short beat before it settles.
export const COLLAPSE_PUYOS_TIMEOUT = 150;
const CLEAR_PUYOS_TIMEOUT = 400;
const LANDING_PUYOS_TIMEOUT = 300;

export const Game = () => {
  const grid = useStore((store) => store.grid);
  const puyos = useStore((store) => store.puyos);
  const userPuyoIds = useStore((store) => store.userPuyoIds);
  const nextPuyoIds = useStore((store) => store.nextPuyoIds);
  const screen = useStore((store) => store.screen);
  const padding = useStore((store) => store.padding);
  const localGameState = useStore((store) => store.gameState);
  const puyoIdsToClear = useStore((store) => store.puyoIdsToClear);
  const tickSpeed = useStore((store) => store.tickSpeed);
  const score = useStore((store) => store.score);
  const totalChainCount = useStore((store) => store.totalChainCount);
  const totalChainSets = useStore((store) => store.totalChainSets);
  const level = useStore((store) => store.level);
  const isDialogOpen = useStore((store) => store.isDialogOpen);
  const volume = useAudioStore((store) => store.volume);

  const setDialogOpen = useStore((store) => store.setDialogOpen);
  const setVolume = useAudioStore((store) => store.setVolume);
  const setCellSize = useStore((store) => store.setCellSize);
  const restoreGame = useStore((store) => store.restoreGame);

  // Board size based on screen size, surrounding ui and global padding —
  // this used to live inside ThreeBoard.tsx itself, but that made it
  // impossible to reuse for a board with different surrounding chrome (e.g.
  // BoardEditor's own layout); ThreeBoard now just renders at whatever
  // width/height it's given.
  const boardPadding = 10;
  const widthAdjust = padding + 48 + 16 + 16 + 48 + padding;
  const heightAdjust = padding + 128 + 16 + padding;
  const baseWidthOnHeight =
    screen.height - heightAdjust < (screen.width - widthAdjust) * 2;
  const boardWidth = baseWidthOnHeight
    ? (screen.height - heightAdjust) / 2
    : screen.width - widthAdjust;
  const boardHeight = boardWidth * 2 - boardPadding;

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
  const landingResetCount = useStore((store) => store.landingResetCount);
  const lastCollapseMaxFallRows = useStore(
    (store) => store.lastCollapseMaxFallRows,
  );

  // While the dialog is open, gameplay should read as paused — this used to
  // compute `localGameState === 'paused'`, a boolean equality check instead
  // of the string 'paused', so gameState briefly became `true`/`false`
  // whenever the dialog opened. Since every comparison elsewhere expects a
  // GameState string (e.g. `gameState !== 'paused'`), that boolean never
  // matched 'paused', so opening the dialog didn't actually block
  // move/rotate input like it was clearly meant to.
  const gameState: GameState = isDialogOpen ? 'paused' : localGameState;

  // --------------------------------------------------------------------------
  // SSR check
  // --------------------------------------------------------------------------
  useEffect(() => {
    setIsSSR(false);
  }, []);

  // --------------------------------------------------------------------------
  // Resume on refresh — a snapshot is saved every time a fresh piece is about
  // to drop (see the 'drop-puyos' branch below), so a refresh mid-game
  // restores the actual board/queue right away (via restoreGame, below)
  // instead of losing the run. Always comes back paused rather than
  // auto-resuming — the "Resume" alert (rendered whenever localGameState is
  // 'paused') is what actually unpauses, via the same togglePauseGame a
  // manual pause uses.
  // --------------------------------------------------------------------------
  const [savedGame, setSavedGame, isSavedGameHydrated] =
    useSessionStorage<GameSnapshot | null>('puyo-puyo-saved-game', null);
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    if (hasRestoredRef.current || !isSavedGameHydrated || !savedGame) {
      return;
    }

    hasRestoredRef.current = true;
    restoreGame(savedGame);
    // Deliberately excludes `savedGame` — this must only ever fire once,
    // right as hydration completes. Depending on savedGame re-fires this
    // effect every time a fresh checkpoint is saved during normal play
    // (setSavedGame in the 'drop-puyos' branch below also changes it), which
    // force-paused a game that had just been freshly started, immediately
    // showing the Resume alert instead of actually playing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSavedGameHydrated, restoreGame]);

  // No run to resume once it's over — otherwise the next refresh (even after
  // starting a brand new game) would restore the dead one.
  useEffect(() => {
    if (gameState === 'lose') {
      setSavedGame(null);
    }
  }, [gameState, setSavedGame]);

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

  useKeyPress('z', [gameState], () => {
    if (gameState !== 'paused' && gameState !== 'lose') {
      rotatePuyos('ccw');
    }
  });

  useKeyPress('x', [gameState], () => {
    if (gameState !== 'paused' && gameState !== 'lose') {
      rotatePuyos('cw');
    }
  });

  useKeyPress('ArrowDown', [gameState], () => {
    if (gameState !== 'paused' && gameState !== 'lose') {
      movePuyos('down');
    }
  });

  useKeyPress('p', [gameState], () => {
    if (gameState !== 'idle' && gameState !== 'lose') {
      togglePauseGame();
    }
  });

  const [isSSR, setIsSSR] = useState(true);

  // --------------------------------------------------------------------------
  // Game state effects
  // --------------------------------------------------------------------------
  const prevGameStateRef = useRef<GameState | null>(null);

  useEffect(() => {
    let interval: number = 0;

    if (gameState === 'start') {
      dropPuyos();
    } else if (gameState === 'drop-puyos') {
      if (prevGameStateRef.current === 'landing-puyos') {
        // Resuming after being freed during the landing window — skip
        // setInterval's own first-fire delay (up to a full tickSpeed), which
        // on top of the landing timeout made the piece feel stuck before it
        // actually dropped again. A fresh spawn (from 'start'/'add-puyos')
        // still waits for the first tick as before, keeping that beat.
        movePuyos('down', 'board');
      } else {
        // A genuinely fresh piece just spawned — everything else has fully
        // resolved (no pending clear/collapse, no partial move), making this
        // the one clean checkpoint to save. Guarded on isSavedGameHydrated so
        // a save can't race ahead of the restore effect reading the previous
        // one on mount.
        if (isSavedGameHydrated) {
          setSavedGame({
            grid,
            puyos,
            userPuyoIds,
            nextPuyoIds,
            score,
            level,
            tickSpeed,
            totalChainCount,
            totalChainSets,
          });
        }
      }

      interval = window.setInterval(() => {
        movePuyos('down', 'board');
      }, tickSpeed);
    } else if (gameState === 'paused') {
      window.clearInterval(interval);
    } else if (gameState === 'landed-puyos') {
      window.clearInterval(interval);
      landedPuyos();
    } else if (gameState === 'collapse-puyos') {
      // If puyoIdsToClear is non-empty, we just cleared a group and its
      // sink-away exit animation (in PuyoMetaballs) is still playing —
      // dropping the rest of the board into the gap before that finishes
      // reads as the drop happening "too soon". Wait out however long the
      // largest cleared group's animation actually takes instead of the
      // short, fixed COLLAPSE_PUYOS_TIMEOUT (which is for the other case
      // this state handles: the active piece landing unsupported, with no
      // exit animation to wait for).
      const delay =
        puyoIdsToClear.length > 0
          ? (Math.max(
              ...puyoIdsToClear.map((group) =>
                getSinkAnimationDurationSeconds(group.length),
              ),
            ) +
              CLEAR_TO_COLLAPSE_PAUSE_SECONDS) *
            1000
          : COLLAPSE_PUYOS_TIMEOUT;

      window.setTimeout(() => {
        collapsePuyos();
      }, delay);
    } else if (gameState === 'clear-puyos') {
      // Entered either fresh off a landing (grid hasn't moved — CLEAR_PUYOS_TIMEOUT
      // is just a dramatic pause before the about-to-clear group pops) or as a
      // chain continuation straight after collapsePuyos() applied gravity (the
      // puyos that just fell are still visually springing into place in
      // PuyoMetaballs). The latter needs to wait for that specific fall to
      // actually finish settling — proportional to how far it fell — instead of
      // the same fixed pause, otherwise a big multi-row collapse hasn't visually
      // landed yet by the time the next chain clear pops the following group.
      const delay =
        prevGameStateRef.current === 'collapse-puyos'
          ? getFallAnimationDurationSeconds(lastCollapseMaxFallRows) * 1000
          : CLEAR_PUYOS_TIMEOUT;

      window.setTimeout(() => {
        clearPuyos();
      }, delay);
    } else if (gameState === 'add-puyos') {
      addPuyos();
    } else if (gameState === 'lose') {
      loseGame();
    }

    prevGameStateRef.current = gameState;

    return () => {
      window.clearInterval(interval);
    };
    // grid/puyos/userPuyoIds/nextPuyoIds/score/level/totalChainCount/
    // totalChainSets/isSavedGameHydrated/setSavedGame are read above (for the
    // checkpoint save) but deliberately left out of this list — this effect
    // should only re-run on an actual gameState transition (or the other
    // listed values), not on every single tick's grid change, otherwise the
    // interval below gets torn down and recreated every tick and the
    // checkpoint save fires on every tick instead of just on a fresh spawn.
    // The closure still reads their current values correctly because
    // they're all updated in the very same store commit as the gameState
    // transition this effect actually reacts to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gameState,
    puyoIdsToClear,
    tickSpeed,
    lastCollapseMaxFallRows,
    movePuyos,
    addPuyos,
    landedPuyos,
    clearPuyos,
    collapsePuyos,
    loseGame,
    dropPuyos,
  ]);

  // --------------------------------------------------------------------------
  // Landing window — separate from the effect above because it needs to
  // renew (restart its timeout) on every move/rotate made while landing,
  // not just on a gameState change. The reset cap itself (MAX_LANDING_RESETS)
  // is enforced in the store — movePuyos/rotatePuyos refuse to act (and so
  // leave landingResetCount/grid unchanged) once it's reached, so this
  // effect simply stops being retriggered at that point and the
  // already-pending timeout below is left to fire on its own.
  // --------------------------------------------------------------------------
  const landingTimeoutRef = useRef<number>();

  useEffect(() => {
    if (gameState !== 'landing-puyos') {
      // Leaving the landing window for any reason (locked in, paused,
      // lost, etc.) — cancel any pending check.
      window.clearTimeout(landingTimeoutRef.current);
      return;
    }

    window.clearTimeout(landingTimeoutRef.current);
    landingTimeoutRef.current = window.setTimeout(() => {
      landingPuyos();
    }, LANDING_PUYOS_TIMEOUT);
  }, [gameState, landingResetCount, landingPuyos]);

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
        <ThreeBoard
          grid={grid}
          puyos={puyos}
          userPuyoIds={userPuyoIds}
          width={boardWidth}
          height={boardHeight}
          onCellSizeChange={setCellSize}
          className="board mt-auto overflow-hidden"
        />
        {/* <Board grid={grid} className="" /> */}

        <Alert onClick={() => startGame()} isActive={gameState === 'idle'}>
          Start
        </Alert>
        {/* localGameState, not the dialog-derived gameState above — that
        one also reads as 'paused' whenever the menu dialog is open, which
        would otherwise show this behind the dialog too. Covers both a
        restored (auto-paused) game and an ordinary manual pause — clicking
        it just unpauses, same as the pause/play icon button. */}
        <Alert
          onClick={() => togglePauseGame()}
          isActive={localGameState === 'paused' && !isDialogOpen}
        >
          Resume
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
                setSavedGame(null);
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

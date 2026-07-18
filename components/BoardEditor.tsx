import { Canvas, Dpr } from '@react-three/fiber';
import React from 'react';
import { ControlButtons } from './ControlButtons';
import { GridLine } from './ThreeBoard';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { PuyoPuyoLogo } from './PuyoPuyoLogo';
import { ENABLE_METABALL_PUYOS, ENABLE_RAYMARCH_PUYOS } from '../shared/config';
import { clearPuyos } from '../shared/clear-puyos';
import { cloneGrid, collapsePuyos, getPuyoPosition } from '../shared/grid';
import { useAudioStore } from '../store/audioStore';
import { Grid, Puyos, PuyoColour, puyoColours, useStore } from '../store/store';
import {
  getFallAnimationDurationSeconds,
  getSinkAnimationDurationSeconds,
  PuyoMetaballs,
} from './PuyoMetaballs';
import { PuyoRaymarch } from './PuyoRaymarch';

// Standalone board editor: tap a cell to place the selected colour (or
// erase), then Play resolves the layout exactly like the real game would —
// clear any 4+ groups, collapse the gap, repeat until nothing more clears.
// Grid/puyos here are local component state, not the global game store —
// this never touches an active game. The menu dialog and volume toggle are
// the exception — they're app-wide UI/settings state (not game state), so
// they reuse the same store fields Game.tsx does, matching its behaviour
// instead of forking a second copy.
// Mirrors Game.tsx's own page shell — same left-logo/centre-board/right-tools
// grid, board sized the same way as the real game's, and the same rotate/move
// arrow buttons at the bottom — so switching between the two pages feels
// like the same app rather than a bolted-on separate tool. The arrow buttons
// still only affect the global game store though — there's no "active piece"
// in the editor for them to move, so they're along for the visual ride
// rather than wired up to anything here.

type Props = {
  screen: { width: number; height: number };
  padding: number;
};

const COLUMNS = 6;
const ROWS = 14;
// Top 2 rows are the same "queued, hidden" rows as the real board — kept
// here so a cell tapped in the editor lines up with where a real puyo
// would actually land/render.
const HIDDEN_ROWS = 2;
const VISIBLE_ROWS = ROWS - HIDDEN_ROWS;

const stone700 = 'rgb(58, 54, 50)';
const stone950 = 'rgb(23, 20, 18)';

// Matches Puyo.tsx's swatch colours — that file doesn't export its map, so
// this is a small, deliberate duplication rather than a cross-component
// dependency for five colour strings.
const SWATCH_CLASSES: Record<PuyoColour, string> = {
  [PuyoColour.BLUE]: 'bg-blue-400',
  [PuyoColour.RED]: 'bg-red-600',
  [PuyoColour.YELLOW]: 'bg-yellow-400',
  [PuyoColour.GREEN]: 'bg-green-700',
  [PuyoColour.PURPLE]: 'bg-violet-600',
};

type Tool = PuyoColour | 'erase';

function createEmptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => new Array(COLUMNS).fill(null));
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// A collapse here is an instant, grid-level drop (unlike the real game,
// where a puyo has usually only fallen a row or two by the time it settles)
// — a puyo placed high up in the editor can need to fall the whole board.
// Measures the furthest any surviving puyo actually moved so the caller can
// wait for that specific fall to finish landing, via
// getFallAnimationDurationSeconds, rather than a fixed timeout that's too
// short for a tall drop and only sized for a real game's short ones.
function getMaxFallRows(previousGrid: Grid, nextGrid: Grid, ids: string[]) {
  return ids.reduce((maxRows, id) => {
    const [, previousRow] = getPuyoPosition(previousGrid, id);
    const [, nextRow] = getPuyoPosition(nextGrid, id);

    if (previousRow === null || nextRow === null) {
      return maxRows;
    }

    return Math.max(maxRows, nextRow - previousRow);
  }, 0);
}

export const BoardEditor: React.FC<Props> = ({ screen, padding }) => {
  const setDialogOpen = useStore((store) => store.setDialogOpen);
  const volume = useAudioStore((store) => store.volume);
  const setVolume = useAudioStore((store) => store.setVolume);

  // Avoids an SSR/client markup mismatch on first paint — same guard
  // Game.tsx uses around its own volume icon.
  const [isSSR, setIsSSR] = React.useState(true);
  React.useEffect(() => {
    setIsSSR(false);
  }, []);

  const [grid, setGrid] = React.useState<Grid>(createEmptyGrid);
  const [puyos, setPuyos] = React.useState<Puyos>({});
  const [tool, setTool] = React.useState<Tool>(PuyoColour.RED);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const nextIdRef = React.useRef(0);

  // The board you had right before the last Play press — lets Reset put you
  // back at the start of a chain instead of wiping it, so you can watch the
  // same layout resolve again. Stays null until Play has actually run once,
  // so Reset on a freshly-drawn, never-played board just clears it as usual.
  const [prePlaySnapshot, setPrePlaySnapshot] = React.useState<{
    grid: Grid;
    puyos: Puyos;
  } | null>(null);

  // Same board-sizing formula as ThreeBoard.tsx, so the editor's board
  // matches the real game's board pixel-for-pixel at any screen size.
  const boardPadding = 10;
  const widthAdjust = padding + 48 + 16 + 16 + 48 + padding;
  const heightAdjust = padding + 128 + 16 + padding;
  const baseWidthOnHeight =
    screen.height - heightAdjust < (screen.width - widthAdjust) * 2;
  const width = baseWidthOnHeight
    ? (screen.height - heightAdjust) / 2
    : screen.width - widthAdjust;
  const height = width * 2 - boardPadding;
  const cellSize = (width - boardPadding) / 6;

  const handleCellClick = (column: number, row: number) => {
    if (isPlaying) {
      return;
    }

    const newGrid = cloneGrid(grid);
    const newPuyos = { ...puyos };
    const existingId = newGrid[row][column];

    if (existingId) {
      // Clicking a cell that already has a puyo removes it — a second tap
      // acts as a toggle, regardless of which tool is currently selected,
      // rather than recolouring it in place.
      delete newPuyos[existingId];
      newGrid[row][column] = null;
    } else if (tool !== 'erase') {
      const id = `editor-${nextIdRef.current}`;
      nextIdRef.current += 1;
      newGrid[row][column] = id;
      newPuyos[id] = { colour: tool };
    }

    setGrid(newGrid);
    setPuyos(newPuyos);
  };

  const handleReset = () => {
    if (isPlaying) {
      return;
    }

    if (prePlaySnapshot) {
      setGrid(prePlaySnapshot.grid);
      setPuyos(prePlaySnapshot.puyos);
    } else {
      setGrid(createEmptyGrid());
      setPuyos({});
    }
  };

  const handlePlay = async () => {
    if (isPlaying) {
      return;
    }

    setPrePlaySnapshot({ grid, puyos });
    setIsPlaying(true);

    let currentGrid = grid;
    let currentPuyos = puyos;
    let hasCleared = true;

    // Placed puyos can be floating (nothing placed underneath) since the
    // editor doesn't apply gravity as you click — unlike the real game,
    // where pieces have already fallen into a settled position by the time
    // a clear-check happens. Drop everything to its resting position first,
    // otherwise a lone floating puyo never clears and the loop below exits
    // immediately without ever calling collapsePuyos.
    const gridBeforeInitialFall = currentGrid;
    currentGrid = collapsePuyos(currentGrid);
    setGrid(currentGrid);
    await delay(
      getFallAnimationDurationSeconds(
        getMaxFallRows(
          gridBeforeInitialFall,
          currentGrid,
          Object.keys(currentPuyos),
        ),
      ) * 1000,
    );

    // Repeats clear -> collapse until a pass clears nothing — a manually
    // built board can chain just like a real one, so this plays out the
    // whole chain rather than stopping after one clear.
    while (hasCleared) {
      const [clearedGrid, clearedGroups, count] = clearPuyos(
        currentGrid,
        currentPuyos,
      );

      hasCleared = count > 0;

      if (!hasCleared) {
        break;
      }

      const trimmedPuyos = { ...currentPuyos };
      clearedGroups.flat().forEach((id) => {
        delete trimmedPuyos[id];
      });

      currentGrid = clearedGrid;
      currentPuyos = trimmedPuyos;
      setGrid(currentGrid);
      setPuyos(currentPuyos);

      const sinkSeconds = Math.max(
        ...clearedGroups.map((group) =>
          getSinkAnimationDurationSeconds(group.length),
        ),
      );
      await delay(sinkSeconds * 1000);

      const gridBeforeFall = currentGrid;
      currentGrid = collapsePuyos(currentGrid);
      setGrid(currentGrid);
      await delay(
        getFallAnimationDurationSeconds(
          getMaxFallRows(
            gridBeforeFall,
            currentGrid,
            Object.keys(currentPuyos),
          ),
        ) * 1000,
      );
    }

    setIsPlaying(false);
  };

  return (
    <div className="board-editor h-full gap-4">
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

        <div className="mt-auto flex flex-col items-end gap-2">
          {puyoColours.map((colour) => (
            <button
              key={colour}
              type="button"
              title={colour}
              disabled={isPlaying}
              className={[
                'h-8 w-8 rounded-full border-2 sm:h-10 sm:w-10',
                SWATCH_CLASSES[colour],
                tool === colour ? 'border-white' : 'border-transparent',
              ].join(' ')}
              onClick={() => setTool(colour)}
            />
          ))}

          <button
            type="button"
            title="Erase"
            disabled={isPlaying}
            className={[
              'flex h-8 w-8 items-center justify-center rounded-full border-2 bg-stone-800 sm:h-10 sm:w-10',
              tool === 'erase' ? 'border-white' : 'border-transparent',
            ].join(' ')}
            onClick={() => setTool('erase')}
          >
            <Icon name="close" size="sm" />
          </button>
        </div>
      </div>

      <div className="relative flex h-full justify-center overflow-hidden">
        <div
          className="board relative mt-auto overflow-hidden border border-stone-700"
          style={{ width, height, backgroundColor: stone950 }}
        >
          <Canvas
            orthographic={true}
            camera={{ zoom: 1, position: [0, 0, 100] }}
            dpr={[1, 2] as Dpr}
            gl={{ antialias: false }}
          >
            {ENABLE_RAYMARCH_PUYOS ? (
              <PuyoRaymarch
                grid={grid}
                puyos={puyos}
                cellSize={cellSize}
                userPuyoIds={['none-1', 'none-2']}
              />
            ) : ENABLE_METABALL_PUYOS ? (
              <PuyoMetaballs
                grid={grid}
                puyos={puyos}
                cellSize={cellSize}
                userPuyoIds={['none-1', 'none-2']}
              />
            ) : null}

            {[...new Array(11)].map((_, i) => {
              const y = i * cellSize - cellSize * 5;
              return (
                <GridLine
                  start={[-3 * cellSize, y]}
                  end={[3 * cellSize, y]}
                  color={stone700}
                  key={i}
                />
              );
            })}

            {[...new Array(5)].map((_, i) => {
              const x = i * cellSize - cellSize * 2;
              return (
                <GridLine
                  start={[x, -6 * cellSize]}
                  end={[x, 6 * cellSize]}
                  color={stone700}
                  key={i}
                />
              );
            })}

            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <pointLight position={[0, -10, 5]} intensity={1} />
          </Canvas>

          {/* Invisible click-catcher grid on top of the canvas — trivial
        (column, row) from each cell's own index, rather than raycasting
        into the 3D scene and inverting the board's world-position math. */}
          <div
            className="absolute inset-1 grid"
            style={{
              gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
              gridTemplateRows: `repeat(${VISIBLE_ROWS}, 1fr)`,
            }}
          >
            {Array.from({ length: COLUMNS * VISIBLE_ROWS }).map((_, index) => {
              const column = index % COLUMNS;
              const row = Math.floor(index / COLUMNS) + HIDDEN_ROWS;

              return (
                <button
                  key={`${column}-${row}`}
                  type="button"
                  disabled={isPlaying}
                  className="h-full w-full touch-manipulation border-0 bg-transparent p-0 hover:bg-white/5"
                  onPointerDown={() => handleCellClick(column, row)}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex w-12 flex-col justify-between">
        <div className="mt-auto flex flex-col space-y-4">
          <IconButton name="return-up-back" onClick={handleReset}></IconButton>

          <IconButton name="play" onClick={handlePlay}></IconButton>
        </div>
      </div>

      <ControlButtons className="col-span-3" />

      <style jsx>{`
        .board-editor {
          display: grid;
          grid-template-columns: auto 1fr auto;
          grid-template-rows: auto 1fr;
        }
      `}</style>
    </div>
  );
};

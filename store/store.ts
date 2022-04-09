import create from 'zustand';
import {
  countEmptyCellsBelow,
  collapsePuyos,
  isGridEqual,
  cloneGrid,
} from '../shared/grid';
import { clearPuyos } from '../shared/clear-puyos';
import { getScore } from '../shared/score';

export type GameState =
  | 'idle'
  | 'start'
  | 'stop'
  | 'paused'
  | 'lose'
  | 'drop-puyos'
  | 'landing-puyos'
  | 'landed-puyos'
  | 'clear-puyos'
  | 'collapse-puyos'
  | 'add-puyos';

export type Puyo = {
  colour: PuyoColour;
};
export type Puyos = {
  [k in string]: Puyo;
};
export enum PuyoColour {
  RED = 'red',
  GREEN = 'green',
  BLUE = 'blue',
  YELLOW = 'yellow',
  PURPLE = 'purple',
}
export const puyoColours = [
  PuyoColour.RED,
  PuyoColour.BLUE,
  PuyoColour.GREEN,
  PuyoColour.YELLOW,
  PuyoColour.PURPLE,
];
export type MovePuyoDirection = 'left' | 'right' | 'down';
export type PuyoMoveType = 'left' | 'right' | 'down' | 'rotate';

export type Grid = (string | null)[][];
const clearGrid = [
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  // ['0', '1', '2', '3', '4', '5'],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
];

const INITIAL_TICK_SPEED = 600;

export type Store = {
  gameState: GameState;
  columns: number;
  rows: number;
  grid: Grid;
  /**  TODO: Clean up puyos as they just keep expanding, which could lead to memory issues. But keep in mind puyo ids are incremented from this */
  puyos: Puyos;
  /** Two user controlled puyos, 2nd one rotates around 1st */
  userPuyoIds: [string, string];
  nextPuyoIds: string[];
  /** Puyos about to be cleared */
  puyoIdsToClear: string[][];
  /** Width and height of grid cell */
  cellSize: number;
  /** Time between puyo moves in milliseconds */
  tickSpeed: number;
  score: number;
  /** Temporary chain count between clear and collapse states, used to work out chain power & scoring */
  chainCount: number;
  totalChainCount: number;
  level: number;
  screen: {
    width: number;
    height: number;
  };
  /** Padding referenced from a DOM element with Tailwind responsive width. Use this to responsively work out board dimensions. */
  padding: number;
  /** Testing this out */
  puyoMoveType: PuyoMoveType | null;
  isDialogOpen: boolean;
  setScreen: (width: number, height: number) => void;
  setPadding: (padding: number) => void;
  startGame: () => void;
  dropPuyos: () => void;
  togglePauseGame: () => void;
  loseGame: () => void;
  idleGame: () => void;
  setCellSize: (cellSize: number) => void;
  movePuyos: (direction: MovePuyoDirection, type?: 'user' | 'board') => void;
  rotatePuyos: () => void;
  addPuyos: () => void;
  landingPuyos: () => void;
  landedPuyos: () => void;
  collapsePuyos: () => void;
  clearPuyos: () => void;
  setDialogOpen: (isDialogOpen: boolean) => void;
};

export const useStore = create<Store>((set) => ({
  columns: 6,
  rows: 20,
  cellSize: 30,
  grid: clearGrid,
  puyos: {
    '0': createRandomPuyo(),
    '1': createRandomPuyo(),
    '2': createRandomPuyo(),
    '3': createRandomPuyo(),
    '4': createRandomPuyo(),
    '5': createRandomPuyo(),
  },
  userPuyoIds: ['0', '1'],
  nextPuyoIds: [],
  puyoIdsToClear: [],
  tickSpeed: INITIAL_TICK_SPEED,
  gameState: 'idle',
  score: 0,
  tempPuyoChains: [],
  chainCount: 0,
  totalChainCount: 0,
  level: 0,
  screen: {
    width: 0,
    height: 0,
  },
  padding: 16,
  puyoMoveType: null,
  isDialogOpen: false,
  setScreen: (width, height) =>
    set(() => {
      // console.log(width, height);

      return {
        screen: { width, height },
      };
    }),
  setPadding: (padding) =>
    set(() => {
      return {
        padding,
      };
    }),
  startGame: () =>
    set(() => {
      const grid = cloneGrid(clearGrid);
      // TODO: Drop brand new puyos properly.
      grid[0][2] = '0';
      grid[1][2] = '1';

      return {
        grid,
        gameState: 'start',
        puyos: {
          '0': createRandomPuyo(),
          '1': createRandomPuyo(),
          '2': createRandomPuyo(),
          '3': createRandomPuyo(),
          '4': createRandomPuyo(),
          '5': createRandomPuyo(),
        },
        userPuyoIds: ['0', '1'],
        nextPuyoIds: ['2', '3', '4', '5'],
        score: 0,
        level: 1,
        chainCount: 0,
        totalChainCount: 0,
        tickSpeed: INITIAL_TICK_SPEED,
      };
    }),
  dropPuyos: () =>
    set(() => {
      return {
        gameState: 'drop-puyos',
      };
    }),
  togglePauseGame: () =>
    set((state) => ({
      gameState: state.gameState === 'paused' ? 'drop-puyos' : 'paused',
    })),
  loseGame: () =>
    set(() => {
      return {
        gameState: 'lose',
      };
    }),
  idleGame: () =>
    set(() => {
      return {
        grid: clearGrid,
        nextPuyoIds: [],
        gameState: 'idle',
      };
    }),
  setCellSize: (cellSize) =>
    set(() => {
      return {
        cellSize,
      };
    }),
  addPuyos: () =>
    // TS will error if not the same return shape
    // @ts-ignore
    set((state) => {
      // If not enough space for puyos, YOU LOSE!
      if (state.grid[0][2] || state.grid[1][2]) {
        return {
          gameState: 'lose',
        };
      }

      // Create new next puyos
      const newPuyo1 = createRandomPuyo();
      const newPuyo2 = createRandomPuyo();
      const puyoCount = Object.keys(state.puyos).length;
      const newPuyo1Id = puyoCount.toString();
      const newPuyo2Id = (puyoCount + 1).toString();
      const puyos = { ...state.puyos };

      // Add to map of puyos
      puyos[newPuyo1Id] = newPuyo1;
      puyos[newPuyo2Id] = newPuyo2;

      // Add puyos to grid
      const grid = cloneGrid(state.grid);
      grid[0][2] = state.nextPuyoIds[1];
      grid[1][2] = state.nextPuyoIds[0];

      return {
        // Assign next two puyos to user
        userPuyoIds: [state.nextPuyoIds[0], state.nextPuyoIds[1]],
        nextPuyoIds: [
          // Remove next puyos in queue
          ...state.nextPuyoIds.slice(2),
          // Add new puyoIds
          newPuyo1Id,
          newPuyo2Id,
        ],
        puyos,
        grid,
        // Drop dem new puyos down
        gameState: 'drop-puyos',
      };
    }),
  movePuyos: (direction, type = 'user') => {
    set((state) => {
      const grid = cloneGrid(state.grid);
      const [puyo1Id, puyo2Id] = state.userPuyoIds;
      const [puyo1Column, puyo1Row] = getPuyoPosition(state.grid, puyo1Id);
      const [puyo2Column, puyo2Row] = getPuyoPosition(state.grid, puyo2Id);

      let gameState = state.gameState;

      if (
        typeof puyo1Row === 'number' &&
        typeof puyo1Column === 'number' &&
        typeof puyo2Row === 'number' &&
        typeof puyo2Column === 'number'
      ) {
        if (direction === 'down') {
          const count = countEmptyCellsBelow(grid, state.userPuyoIds);

          // Work out how many cells to move down
          // Board automatically drops one cell at a time
          let moveDownCount = 1;
          if (type === 'user') {
            moveDownCount = count < 3 ? count : 3;
          }

          if (count > 0) {
            if (puyo1Row > puyo2Row) {
              // Puyo1 is lower, so move it down first
              grid[puyo1Row][puyo1Column] = null;
              grid[puyo1Row + moveDownCount][puyo1Column] = puyo1Id;
              grid[puyo2Row][puyo2Column] = null;
              grid[puyo2Row + moveDownCount][puyo2Column] = puyo2Id;
            } else {
              // Puyo2 is lower, so move it down first
              grid[puyo2Row][puyo2Column] = null;
              grid[puyo2Row + moveDownCount][puyo2Column] = puyo2Id;
              grid[puyo1Row][puyo1Column] = null;
              grid[puyo1Row + moveDownCount][puyo1Column] = puyo1Id;
            }
          } else {
            gameState = 'landing-puyos';
          }
        } else if (direction === 'left') {
          if (puyo1Column === puyo2Column) {
            // Vertical puyos
            // Check for collisions on the left
            if (
              grid[puyo1Row][puyo1Column - 1] === null &&
              grid[puyo2Row][puyo2Column - 1] === null
            ) {
              grid[puyo1Row][puyo1Column] = null;
              grid[puyo1Row][puyo1Column - 1] = puyo1Id;
              grid[puyo2Row][puyo2Column] = null;
              grid[puyo2Row][puyo2Column - 1] = puyo2Id;
            }
          } else {
            // Horizontal puyos
            if (puyo1Column < puyo2Column) {
              // Work out which puyo is on the left, then use it to check
              // for collisions.

              // Puyo1 is on the left, so use it to check collision
              if (grid[puyo1Row][puyo1Column - 1] === null) {
                grid[puyo1Row][puyo1Column] = null;
                grid[puyo1Row][puyo1Column - 1] = puyo1Id;
                grid[puyo2Row][puyo2Column] = null;
                grid[puyo2Row][puyo2Column - 1] = puyo2Id;
              }
            } else {
              // Puyo2 is on the left, so use it to check collision
              if (grid[puyo2Row][puyo2Column - 1] === null) {
                grid[puyo2Row][puyo2Column] = null;
                grid[puyo2Row][puyo2Column - 1] = puyo2Id;
                grid[puyo1Row][puyo1Column] = null;
                grid[puyo1Row][puyo1Column - 1] = puyo1Id;
              }
            }
          }
        } else if (direction === 'right') {
          if (puyo1Column === puyo2Column) {
            // Vertical puyos
            // Check for collisions on the right
            if (
              grid[puyo1Row][puyo1Column + 1] === null &&
              grid[puyo2Row][puyo2Column + 1] === null
            ) {
              grid[puyo1Row][puyo1Column] = null;
              grid[puyo1Row][puyo1Column + 1] = puyo1Id;
              grid[puyo2Row][puyo2Column] = null;
              grid[puyo2Row][puyo2Column + 1] = puyo2Id;
            }
          } else {
            // Horizontal puyos

            // Work out which puyo is on the right, then use it to check
            // for collisions.
            if (puyo1Column > puyo2Column) {
              // Puyo1 is on the right, so use it to check collision
              if (grid[puyo1Row][puyo1Column + 1] === null) {
                grid[puyo1Row][puyo1Column] = null;
                grid[puyo1Row][puyo1Column + 1] = puyo1Id;
                grid[puyo2Row][puyo2Column] = null;
                grid[puyo2Row][puyo2Column + 1] = puyo2Id;
              }
            } else {
              // Puyo2 is on the right, so use it to check collision
              if (grid[puyo2Row][puyo2Column + 1] === null) {
                grid[puyo2Row][puyo2Column] = null;
                grid[puyo2Row][puyo2Column + 1] = puyo2Id;
                grid[puyo1Row][puyo1Column] = null;
                grid[puyo1Row][puyo1Column + 1] = puyo1Id;
              }
            }
          }
        }
      }

      return {
        grid,
        gameState,
        // puyoMoveType: type === 'user' ? 'down' : null,
      };
    });
  },
  rotatePuyos: () => {
    set((state) => {
      const grid = cloneGrid(state.grid);
      const [puyo1Id, puyo2Id] = state.userPuyoIds;
      const [puyo1Column, puyo1Row] = getPuyoPosition(state.grid, puyo1Id);
      const [puyo2Column, puyo2Row] = getPuyoPosition(state.grid, puyo2Id);

      // Work out relative position of puyo2
      let puyo2Position: 'up' | 'right' | 'down' | 'left' = 'down';

      if (
        typeof puyo1Column === 'number' &&
        typeof puyo1Row === 'number' &&
        typeof puyo2Column === 'number' &&
        typeof puyo2Row === 'number'
      ) {
        if (puyo1Column === puyo2Column) {
          if (puyo1Row > puyo2Row) {
            puyo2Position = 'up';
          } else {
            puyo2Position = 'down';
          }
        } else if (puyo1Row === puyo2Row) {
          if (puyo1Column > puyo2Column) {
            puyo2Position = 'left';
          } else {
            puyo2Position = 'right';
          }
        }

        if (puyo2Position === 'up') {
          if (grid[puyo1Row][puyo2Column + 1] === null) {
            // Move puyo2 to the right of puyo1
            grid[puyo2Row][puyo2Column] = null;
            grid[puyo1Row][puyo2Column + 1] = puyo2Id;
          } else if (grid[puyo1Row][puyo1Column - 1] === null) {
            // There is room on left, so rotate and shift both puyos
            grid[puyo2Row][puyo2Column] = null;
            grid[puyo1Row][puyo1Column - 1] = puyo1Id;
            grid[puyo1Row][puyo1Column] = puyo2Id;
          } else if (
            grid[puyo1Row][puyo1Column + 1] !== null &&
            grid[puyo1Row][puyo1Column - 1] !== null
          ) {
            // No room on either side, so flip puyos
            grid[puyo2Row][puyo2Column] = puyo1Id;
            grid[puyo1Row][puyo1Column] = puyo2Id;
          }
        } else if (puyo2Position === 'right') {
          if (grid[puyo1Row + 1] && grid[puyo1Row + 1][puyo1Column] === null) {
            // Move puyo2 below puyo1
            grid[puyo2Row][puyo2Column] = null;
            grid[puyo1Row + 1][puyo1Column] = puyo2Id;
          } else {
            // Move puyo2 below puyo1 AND shift puyos up
            grid[puyo2Row][puyo2Column] = null;
            grid[puyo1Row - 1][puyo1Column] = puyo1Id;
            grid[puyo2Row][puyo2Column - 1] = puyo2Id;
          }
        } else if (puyo2Position === 'down') {
          if (grid[puyo1Row][puyo2Column - 1] === null) {
            // Move puyo2 to the left of puyo1
            grid[puyo2Row][puyo2Column] = null;
            grid[puyo1Row][puyo2Column - 1] = puyo2Id;
          } else if (grid[puyo1Row][puyo1Column + 1] === null) {
            // There is room on right, so rotate and shift both puyos
            grid[puyo2Row][puyo2Column] = null;
            grid[puyo1Row][puyo1Column + 1] = puyo1Id;
            grid[puyo1Row][puyo1Column] = puyo2Id;
          } else if (
            grid[puyo2Row][puyo2Column + 1] !== null &&
            grid[puyo2Row][puyo2Column - 1] !== null
          ) {
            // No room on either side, so flip puyos
            grid[puyo2Row][puyo2Column] = puyo1Id;
            grid[puyo1Row][puyo1Column] = puyo2Id;
          }
        } else if (puyo2Position === 'left') {
          if (grid[puyo2Row - 1] && grid[puyo2Row - 1][puyo1Column] === null) {
            // Move puyo2 above of puyo1
            grid[puyo2Row][puyo2Column] = null;
            grid[puyo2Row - 1][puyo1Column] = puyo2Id;
          }
        }
      }

      return {
        grid,
        puyoMoveType: 'rotate',
      };
    });
  },
  landingPuyos: () => {
    set((state) => {
      const count = countEmptyCellsBelow(state.grid, state.userPuyoIds);

      return {
        // There is a bit of time while landing to move puyos, but after that,
        // trigger landed-puyos to start clear/collapse state
        gameState: count === 0 ? 'landed-puyos' : 'drop-puyos',
      };
    });
  },
  landedPuyos: () =>
    // Jest wigs out for some reason
    // @ts-ignore
    set((state) => {
      // Check if puyos need to be collapsed
      const collapsedGrid = collapsePuyos(state.grid);
      const hasGridCollapsed = !isGridEqual(collapsedGrid, state.grid);

      if (hasGridCollapsed) {
        return {
          gameState: 'collapse-puyos',
          puyoIdsToClear: [],
        };
      }

      // Check if puyos need to be cleared
      const [clearedGrid, puyoIdsToClear] = clearPuyos(state.grid, state.puyos);
      const hasGridCleared = !isGridEqual(clearedGrid, state.grid);

      // console.log(getPuyoPosition(state.grid, puyoIdsToClear[0][0]));

      if (hasGridCleared) {
        return {
          gameState: 'clear-puyos',
          puyoIdsToClear,
        };
      }

      return {
        gameState: 'add-puyos',
        puyoIdsToClear: [],
      };
    }),
  collapsePuyos: () =>
    set((state) => {
      const grid = collapsePuyos(state.grid);

      return {
        grid,
        gameState: 'clear-puyos',
      };
    }),
  clearPuyos: () =>
    set((state) => {
      const [grid, clearedPuyoIdGroups, totalCount] = clearPuyos(
        state.grid,
        state.puyos,
      );

      const puyoChains = clearedPuyoIdGroups.map((puyoIds) =>
        puyoIds.map((puyoId) => state.puyos[puyoId].colour),
      );

      // If there are puyos cleared, collapse puyos and keep track of chains
      if (totalCount) {
        return {
          grid,
          gameState: 'collapse-puyos',
          puyoIdsToClear: clearedPuyoIdGroups,
          score: state.score + getScore(state.chainCount + 1, puyoChains),
          chainCount: state.chainCount + 1,
          totalChainCount: state.totalChainCount + 1,
          tickSpeed: state.tickSpeed,
        };
      }

      // If there are no more puyos cleared, add up total score and continue
      // game and add puyos
      return {
        grid,
        gameState: 'add-puyos',
        puyoIdsToClear: [],
        score: state.score,
        chainCount: 0,
        totalChainCount: state.totalChainCount,
        tickSpeed: getTickSpeed(state.totalChainCount),
      };
    }),
  setDialogOpen: (isDialogOpen) => set(() => ({ isDialogOpen })),
}));

function getTickSpeed(totalChainCount: number): number {
  if (totalChainCount >= 30) {
    return 100;
  } else if (totalChainCount >= 25) {
    return 150;
  } else if (totalChainCount >= 20) {
    return 200;
  } else if (totalChainCount >= 15) {
    return 300;
  } else if (totalChainCount >= 10) {
    return 400;
  } else if (totalChainCount >= 5) {
    return 500;
  }

  return INITIAL_TICK_SPEED;
}

function createRandomPuyo(): Puyo {
  return {
    colour: puyoColours[Math.floor(Math.random() * puyoColours.length)],
    // colour: puyoColours[0],
  };
}

/**
 * Get column and row values of puyo in grid
 * @returns [column, row]
 */
export function getPuyoPosition(
  grid: Grid,
  id: string,
): [number | null, number | null] {
  let puyoColumn = null;
  let puyoRow = null;

  grid.forEach((columns, row) =>
    columns.find((cellId, column) => {
      if (cellId && cellId === id) {
        puyoColumn = column;
        puyoRow = row;
      }
    }),
  );

  return [puyoColumn, puyoRow];
}

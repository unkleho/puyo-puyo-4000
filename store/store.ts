import create from 'zustand';
import { checkDown, collapsePuyos } from '../shared';
import { clearPuyos } from '../shared/clear-puyos';
import { getScore } from '../shared/score';

export type GameState =
  | 'idle'
  | 'start'
  | 'stop'
  | 'paused'
  | 'lose'
  | 'drop-puyos'
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

export type Grid = (string | null)[][];
const clearGrid = [
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
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
];

export type Store = {
  gameState: GameState;
  columns: number;
  rows: number;
  grid: Grid;
  puyos: Puyos;
  /** Two user controlled puyos, 2nd one rotates around 1st */
  userPuyoIds: [string, string];
  nextPuyoIds: string[];
  /** Puyos about to be cleared */
  puyoIdsToClear: string[];
  /** Width and height of grid cell */
  cellSize: number;
  /** Time between puyo moves in milliseconds */
  tickSpeed: number;
  score: number;
  /** Temporary chain count between clear and collapse states, used to work out chain power & scoring */
  chainCount: number;
  startGame: () => void;
  togglePauseGame: () => void;
  movePuyos: (direction: MovePuyoDirection) => void;
  rotatePuyos: () => void;
  addPuyos: () => void;
  landedPuyos: () => void;
  collapsePuyos: () => void;
  clearPuyos: () => void;
  loseGame: () => void;
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
  tickSpeed: 500,
  gameState: 'idle',
  score: 0,
  tempPuyoChains: [],
  chainCount: 0,
  startGame: () =>
    set(() => {
      const grid = cloneGrid(clearGrid);
      // TODO: Drop brand new puyos properly. May need to create two hidden rows above grid
      grid[0][2] = '0';
      grid[1][2] = '1';

      return {
        grid,
        gameState: 'drop-puyos',
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
      // TODO: Work out foolproof way of creating ids
      const newPuyo1Id = Math.floor(Math.random() * 10000).toString();
      const newPuyo2Id = Math.floor(Math.random() * 10000).toString();
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
  movePuyos: (direction) => {
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
          const puyoState = checkDown(grid, state.userPuyoIds);
          // console.log(puyoState);

          if (puyoState === 'active') {
            if (puyo1Row > puyo2Row) {
              // Puyo1 is lower, so move it down first
              grid[puyo1Row][puyo1Column] = null;
              grid[puyo1Row + 1][puyo1Column] = puyo1Id;
              grid[puyo2Row][puyo2Column] = null;
              grid[puyo2Row + 1][puyo2Column] = puyo2Id;
            } else {
              // Puyo2 is lower, so move it down first
              grid[puyo2Row][puyo2Column] = null;
              grid[puyo2Row + 1][puyo2Column] = puyo2Id;
              grid[puyo1Row][puyo1Column] = null;
              grid[puyo1Row + 1][puyo1Column] = puyo1Id;
            }
          } else {
            gameState = 'landed-puyos';
          }
        } else if (direction === 'left') {
          // Work out which puyo is on the left, then use it to check
          // for collisions.
          if (puyo1Column < puyo2Column) {
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
        } else if (direction === 'right') {
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

      return {
        grid,
        gameState,
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
          }
        } else if (puyo2Position === 'right') {
          if (grid[puyo1Row + 1] && grid[puyo1Row + 1][puyo1Column] === null) {
            // Move puyo2 below puyo1
            grid[puyo2Row][puyo2Column] = null;
            grid[puyo1Row + 1][puyo1Column] = puyo2Id;
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

      // console.log('clearPuyos', puyoChains);

      // If there are puyos cleared, collapse puyos and keep track of chains
      if (totalCount) {
        return {
          grid,
          gameState: 'collapse-puyos',
          score: state.score + getScore(state.chainCount + 1, puyoChains),
          chainCount: state.chainCount + 1,
        };
      }

      // If there are no more puyos cleared, add up total score and continue
      // game and add puyos
      return {
        grid,
        // gameState: totalCount ? 'collapse-puyos' : 'add-puyos',
        gameState: 'add-puyos',
        score: state.score,
        chainCount: 0,
      };
    }),
}));

function createRandomPuyo(): Puyo {
  return {
    colour: puyoColours[Math.floor(Math.random() * puyoColours.length)],
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

/**
 * Make clone of grid
 */
export function cloneGrid(grid: Grid) {
  const newGrid = grid.map((columns) => columns.slice());

  return newGrid;
}

/**
 * Check if two grids are the same
 */
export function isGridEqual(oldGrid: Grid, newGrid: Grid) {
  return (
    oldGrid.map((columns) => columns.join(',')).join(',') ===
    newGrid.map((columns) => columns.join(',')).join(',')
  );
}

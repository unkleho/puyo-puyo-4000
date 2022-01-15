import create from 'zustand';

export type Store = {
  gameState: GameState;
  columns: number;
  rows: number;
  grid: Grid;
  puyos: Puyos;
  nextPuyoIds: string[];
  /** Two user controlled puyos, 2nd one rotates around 1st */
  userPuyoIds: [string, string];
  /** Width and height of grid cell */
  cellSize: number;
  togglePauseGame: () => void;
  movePuyo: (direction: MovePuyoDirection) => void;
  rotatePuyo: () => void;
  addPuyoToGrid: () => void;
};

export type Puyo = {
  // id: string;
  colour: PuyoColour;
  row?: number;
  column?: number;
  // state: PuyoState;
};
export type Puyos = {
  [k in string]: Puyo;
};

export type MovePuyoDirection = 'left' | 'right' | 'down';

// type PuyoColour = 'red' | 'green' | 'blue' | 'yellow';
export enum PuyoColour {
  RED = 'red',
  GREEN = 'green',
  BLUE = 'blue',
  YELLOW = 'yellow',
}
// export type PuyoState = 'board' | 'user' | 'queue';
export type GameState = 'drop-puyo' | 'paused' | 'lose' | 'landed';
export type Grid = (string | null)[][];

export const puyoColours = [
  PuyoColour.RED,
  PuyoColour.BLUE,
  PuyoColour.GREEN,
  PuyoColour.YELLOW,
];

export const useStore = create<Store>((set) => ({
  columns: 6,
  rows: 20,
  cellSize: 20,
  grid: [
    [null, null, '0', null, null, null],
    [null, null, '1', null, null, null],
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
  ],
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
  gameState: 'drop-puyo',
  togglePauseGame: () =>
    set((state) => ({
      gameState: state.gameState === 'paused' ? 'drop-puyo' : 'paused',
    })),
  addPuyoToGrid: () =>
    set((state) => {
      // Create new next puyos
      const newPuyo1 = createRandomPuyo();
      const newPuyo2 = createRandomPuyo();
      const newPuyo1Id = Math.floor(Math.random() * 10000).toString();
      const newPuyo2Id = Math.floor(Math.random() * 10000).toString();
      const puyos = { ...state.puyos };

      // Add to map of puyos
      puyos[newPuyo1Id] = newPuyo1;
      puyos[newPuyo2Id] = newPuyo2;

      // Add puyos to grid
      const grid = cloneGrid(state.grid);
      grid[0][2] = state.nextPuyoIds[0];
      grid[1][2] = state.nextPuyoIds[1];

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
        gameState: 'drop-puyo',
      };
    }),
  movePuyo: (direction) => {
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
          // Work out which puyo is lower, then use it to check for collisions.
          if (puyo1Row > puyo2Row) {
            // Puyo1 is lower, so use it to check collision
            if (
              grid[puyo1Row + 1] &&
              grid[puyo1Row + 1][puyo1Column] === null
            ) {
              grid[puyo1Row][puyo1Column] = null;
              grid[puyo1Row + 1][puyo1Column] = puyo1Id;
              grid[puyo2Row][puyo2Column] = null;
              grid[puyo2Row + 1][puyo2Column] = puyo2Id;
            } else {
              gameState = 'landed';
            }
          } else {
            // Puyo2 is lower, so use it to check collision
            if (
              grid[puyo2Row + 1] &&
              grid[puyo2Row + 1][puyo2Column] === null
            ) {
              grid[puyo2Row][puyo2Column] = null;
              grid[puyo2Row + 1][puyo2Column] = puyo2Id;
              grid[puyo1Row][puyo1Column] = null;
              grid[puyo1Row + 1][puyo1Column] = puyo1Id;
            } else {
              gameState = 'landed';
            }
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
  rotatePuyo: () => {
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
          }
        } else if (puyo2Position === 'right') {
          if (grid[puyo1Row + 1][puyo1Column] === null) {
            // Move puyo2 below puyo1
            grid[puyo2Row][puyo2Column] = null;
            grid[puyo1Row + 1][puyo1Column] = puyo2Id;
          }
        } else if (puyo2Position === 'down') {
          if (grid[puyo1Row][puyo2Column - 1] === null) {
            // Move puyo2 to the left of puyo1
            grid[puyo2Row][puyo2Column] = null;
            grid[puyo1Row][puyo2Column - 1] = puyo2Id;
          }
        } else if (puyo2Position === 'left') {
          if (grid[puyo2Row - 1][puyo1Column] === null) {
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

  // console.log(userPuyo1);
  return [puyoColumn, puyoRow];
}

/**
 * Make clone of grid
 */
export function cloneGrid(grid: Grid) {
  const newGrid = grid.map((columns) => columns.slice());

  return newGrid;
}

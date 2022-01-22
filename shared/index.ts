import {
  cloneGrid,
  getPuyoPosition,
  Grid,
  PuyoColour,
  puyoColours,
} from '../store/store';

type CheckDownState = 'landed' | 'active';
/**
 * Check if user puyos can move down. If it can't, return 'landed' state.
 * @param grid
 * @param userPuyoIds
 */
export function checkDown(
  grid: Grid,
  userPuyoIds: [string, string],
): CheckDownState {
  const userPuyoPositions = userPuyoIds.map((id) => {
    return getPuyoPosition(grid, id);
  });

  let puyoState: CheckDownState = 'active';

  userPuyoPositions.forEach(([column, row], index) => {
    if (typeof column === 'number' && typeof row === 'number') {
      if (grid[row + 1] === undefined) {
        // Puyo has reached bottom as check is out of bounds
        puyoState = 'landed';
      } else {
        const downPuyoId = grid[row + 1][column];
        // Check if puyo below is part of user puyo
        const userPuyoIsDown = userPuyoIds.includes(downPuyoId as string);

        if (!userPuyoIsDown && grid[row + 1][column] !== null) {
          puyoState = 'landed';
        }
      }
    }
  });

  return puyoState;
}

/**
 * After clearing or landing puyos, collapse down any gaps in the grid
 */
export function collapsePuyos(oldGrid: Grid): Grid {
  // Store original number of rows
  const totalRows = oldGrid.length;

  // Convert to an array of columns
  const rotatedGrid = rotateGrid(cloneGrid(oldGrid));

  // Filter out nulls in between puyos
  const filteredGrid = rotatedGrid.map((columns) => {
    return columns.filter((column) => column);
  });

  // Pad out nulls
  const paddedGrid = filteredGrid.map((columns) =>
    padEnd(columns, totalRows, null),
  );

  // Rotate and Convert to array of rows
  // (Sorry, not the most efficient!)
  const newGrid = rotateGrid(rotateGrid(rotateGrid(paddedGrid)));

  return newGrid;
}

export function rotateGrid(grid: Grid): Grid {
  return grid[0].map((column, index) => {
    return grid.map((row) => row[index]).reverse();
  });
}

export function padEnd(array: any[], minLength: number, fillValue: any) {
  return Object.assign(new Array(minLength).fill(fillValue), array);
}

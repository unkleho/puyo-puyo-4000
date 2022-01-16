import { cloneGrid, getPuyoPosition, Grid } from '../store/store';

/**
 * Check if user puyos can move down. If it can't, return 'landed' state.
 * @param grid
 * @param userPuyoIds
 * @returns
 */
export function checkDown(grid: Grid, userPuyoIds: [string, string]) {
  const userPuyoPositions = userPuyoIds.map((id) => {
    return getPuyoPosition(grid, id);
  });

  let puyoState: 'landed' | 'active' = 'active';

  userPuyoPositions.forEach(([column, row]) => {
    if (typeof column === 'number' && typeof row === 'number') {
      if (grid[row + 1] && grid[row + 1][column] === null) {
      } else {
        puyoState = 'landed';
      }
    }
  });

  return puyoState;
}

export function dropPuyos(oldGrid: Grid): Grid {
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

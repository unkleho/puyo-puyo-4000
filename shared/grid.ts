import { Grid } from '../store/store';

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

/**
 * Count how many empty cells are below user puyos
 */
export function countEmptyCellsBelow(
  grid: Grid,
  userPuyoIds: [string, string],
): number {
  let userPuyoPositions = userPuyoIds.map((id) => {
    return getPuyoPosition(grid, id);
  });

  const puyo1Row = userPuyoPositions[0][1];
  const puyo2Row = userPuyoPositions[1][1];

  // Check if user puyos are vertical
  if (typeof puyo1Row === 'number' && typeof puyo2Row === 'number') {
    if (puyo1Row !== puyo2Row) {
      // If so, only keep user puyo with highest row (lowest user puyo on grid)
      if (puyo1Row > puyo2Row) {
        userPuyoPositions = [userPuyoPositions[0]];
      } else {
        userPuyoPositions = [userPuyoPositions[1]];
      }
    }
  }

  const counts: number[] = [];

  userPuyoPositions.forEach(([column, row], index) => {
    if (typeof column === 'number' && typeof row === 'number') {
      let nextRow = row;
      while (grid[nextRow + 1] && grid[nextRow + 1][column] == null) {
        nextRow++;
      }

      const count = nextRow - row;
      counts.push(count);
    }
  });

  // Get lowest count (user puyo that is closest to the another puyo below)
  counts.sort();

  // console.log(counts);

  return counts[0];
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

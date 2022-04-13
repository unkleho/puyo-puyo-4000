import { Grid, Puyos } from '../store/store';
import { cloneGrid, getPuyoPosition } from './grid';

/**
 * Get new grid with cleared puyos. Use breadth first search algo.
 * https://github.com/shjang1007/puyo-puyo/blob/master/lib/board.js#L81-L111
 */
export function clearPuyos(
  oldGrid: Grid,
  oldPuyos: Puyos,
): [Grid, string[][], number] {
  const grid = cloneGrid(oldGrid);
  const puyos = {
    ...oldPuyos,
  };
  let totalCount = 0;
  let totalPuyoIdsToClear: string[][] = [];

  // Loop through each puyo
  Object.keys(puyos).forEach((puyoId) => {
    let count = 1;
    let queue = [puyoId];
    let puyoIdsToClear = [puyoId];

    while (queue.length > 0) {
      const currentPuyoId = queue.shift();

      if (currentPuyoId) {
        const currentPuyo = puyos[currentPuyoId];
        const adjacentPuyoIds = getAdjacentPuyoIds(grid, currentPuyoId);

        // Go through each adjacent puyo
        adjacentPuyoIds.forEach((adjacentPuyoId) => {
          const adjacentPuyo = puyos[adjacentPuyoId];

          // Check if it has the same colour as current puyo
          // and if it hasn't been marked for destroying
          if (
            adjacentPuyo &&
            currentPuyo.colour === adjacentPuyo.colour &&
            !puyoIdsToClear.includes(adjacentPuyoId)
          ) {
            count += 1;
            // Add to the queue and continue while loop
            queue.push(adjacentPuyoId);
            // Mark this puyo to get destroyed, otherwise we get infinite loop
            puyoIdsToClear.push(adjacentPuyoId);
          }
        });
      }
    }

    if (count >= 4) {
      totalCount += count;
      totalPuyoIdsToClear = [...totalPuyoIdsToClear, puyoIdsToClear];

      puyoIdsToClear.forEach((puyoIdToClear) => {
        const [column, row] = getPuyoPosition(grid, puyoIdToClear);

        if (typeof column === 'number' && typeof row === 'number') {
          // Clear grid of puyos
          grid[row][column] = null;
          // Delete puyo from list of puyos
          delete puyos[puyoIdToClear];
        }
      });
    }
  });

  return [grid, totalPuyoIdsToClear, totalCount];
}

/**
 * Get puyoIds of adjacent puyos
 * @param grid
 * @param puyoId
 * @returns
 */
export function getAdjacentPuyoIds(grid: Grid, puyoId: string): string[] {
  const [column, row] = getPuyoPosition(grid, puyoId);
  let puyos = [];

  if (typeof column === 'number' && typeof row === 'number') {
    // Top
    if (grid[row - 1] && grid[row - 1][column]) {
      puyos.push(grid[row - 1][column]);
    }
    // Right
    if (grid[row][column + 1]) {
      puyos.push(grid[row][column + 1]);
    }
    // Bottom
    if (grid[row + 1] && grid[row][column]) {
      puyos.push(grid[row + 1][column]);
    }
    // Left
    if (grid[row][column - 1]) {
      puyos.push(grid[row][column - 1]);
    }
  }

  return puyos as string[];
}

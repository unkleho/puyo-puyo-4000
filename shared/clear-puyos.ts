import { cloneGrid, getPuyoPosition, Grid, Puyos } from '../store/store';

/**
 * Get new grid with cleared puyos. Use breadth first search algo.
 * https://github.com/shjang1007/puyo-puyo/blob/master/lib/board.js#L81-L111
 */
export function clearPuyos(
  oldGrid: Grid,
  oldPuyos: Puyos,
): [Grid, Puyos, number] {
  const grid = cloneGrid(oldGrid);
  const puyos = {
    ...oldPuyos,
  };
  let totalCount = 0;

  // Loop through each puyo
  Object.keys(puyos).forEach((puyoId) => {
    let count = 1;
    let queue = [puyoId];
    let puyoIdsToDestroy = [puyoId];

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
            !puyoIdsToDestroy.includes(adjacentPuyoId)
          ) {
            count += 1;
            // Add to the queue and continue while loop
            queue.push(adjacentPuyoId);
            // Mark this puyo to get destroyed, otherwise we get infinite loop
            puyoIdsToDestroy.push(adjacentPuyoId);
          }
        });
      }
    }

    if (count >= 4) {
      totalCount += count;

      puyoIdsToDestroy.forEach((puyoIdToDelete) => {
        const [column, row] = getPuyoPosition(grid, puyoIdToDelete);

        if (typeof column === 'number' && typeof row === 'number') {
          // Clear grid of puyos
          grid[row][column] = null;
          // Delete puyo from list of puyos
          delete puyos[puyoIdToDelete];
        }
      });
    }
  });

  return [grid, puyos, totalCount];
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

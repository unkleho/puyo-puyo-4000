import { Grid, PuyoColour, Puyos } from '../store/store';
import { clearPuyos, getAdjacentPuyoIds } from './clear-puyos';

const grid: Grid = [
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, '8', null, null, null],
  ['4', '6', '7', '9', null, null],
  ['0', '1', '2', '3', '5', null],
];
const puyos: Puyos = {
  '0': { colour: PuyoColour.BLUE },
  '1': { colour: PuyoColour.BLUE },
  '2': { colour: PuyoColour.BLUE },
  '3': { colour: PuyoColour.BLUE },
  '4': { colour: PuyoColour.BLUE },
  '5': { colour: PuyoColour.GREEN },
  '6': { colour: PuyoColour.RED },
  '7': { colour: PuyoColour.RED },
  '8': { colour: PuyoColour.RED },
  '9': { colour: PuyoColour.RED },
};

describe('Check lines in grid', () => {
  it('should find adjacent puyos', () => {
    const puyoIds = getAdjacentPuyoIds(grid, '1');
    expect(puyoIds).toEqual(['6', '2', '0']);
  });

  it('should find 1 line', () => {
    const [newGrid, newPuyos, totalCount] = clearPuyos(grid, puyos);
    console.log(newGrid, newPuyos, totalCount);
  });
});

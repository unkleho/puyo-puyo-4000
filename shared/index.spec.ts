import { Grid, PuyoColour, Puyos } from '../store/store';
import { checkDown, dropPuyos } from '.';
import { clearPuyos, getAdjacentPuyoIds } from './clear-puyos';

const grid: Grid = [
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, 'user-1', 'user-0', null, null, null],
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
  'user-0': { colour: PuyoColour.YELLOW },
  'user-1': { colour: PuyoColour.BLUE },
};

describe('Clear Puyos', () => {
  it('should find adjacent puyos', () => {
    const puyoIds = getAdjacentPuyoIds(grid, '1');
    expect(puyoIds).toEqual(['6', '2', '0']);
  });

  it('should clear puyos from grid', () => {
    const [newGrid, newPuyos, totalCount] = clearPuyos(grid, puyos);

    // console.log(newGrid, newPuyos, totalCount);
    expect(totalCount).toEqual(9);
  });

  it('should check if user puyos can go down any further', () => {
    const puyoState = checkDown(grid, ['user-0', 'user-1']);
    expect(puyoState).toEqual('active');
  });

  it('should drop puyos down after clearing or user landed', () => {
    const grid = [
      [null, null, null, null, null, null],
      [null, null, null, '3', null, null],
      ['1', '2', null, null, null, null],
      ['0', null, null, '4', null, null],
    ];
    const newGrid = dropPuyos(grid);
    expect(newGrid).toEqual([
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      ['1', null, null, '3', null, null],
      ['0', '2', null, '4', null, null],
    ]);
  });
});

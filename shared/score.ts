import { PuyoColour } from '../store/store';

/**
 * https://puyonexus.com/wiki/Scoring
 * @param puyosCleared Number of puyo cleared in the chain
 * @param chainPower  Based chain power table
 * @param colourBonus Bonus depending on how many different types of colours were cleared
 * @param groupBonus Based on how many puyo were in each group
 * @returns
 */
function getPuyoScore(
  puyosCleared: number,
  chainPower: number,
  colourBonus: number,
  groupBonus: number,
): number {
  const powerBonus = chainPower + colourBonus + groupBonus;

  return puyosCleared * 10 * (powerBonus || 1);
}

/**
 * Score for puyo chain combos
 * @param puyoChains
 */
export function getScore(chainCount: number, puyoChains: PuyoColour[][]) {
  // --------------------------------------------------------------------------
  // Chain Power
  // --------------------------------------------------------------------------
  const chainPowerChains = Object.keys(chainPowerTable).reverse();
  const maxChains = parseInt(chainPowerChains[0]);

  // Work out new chain count, making sure to not exceed chainPowerTable
  const newChainCount = chainCount < maxChains ? chainCount : maxChains;
  // @ts-ignore
  const chainPower = chainPowerTable[newChainCount];

  // --------------------------------------------------------------------------
  // Total Cleared
  // --------------------------------------------------------------------------
  const totalCleared = puyoChains.reduce((total, chain) => {
    return total + chain.length;
  }, 0);

  // --------------------------------------------------------------------------
  // Colour Bonus
  // --------------------------------------------------------------------------
  const totalColours = new Set(
    puyoChains.reduce((prev, chain) => {
      return [...prev, ...chain];
    }, []),
  ).size;
  // @ts-ignore
  const colourBonus = colourBonusTable[totalColours];

  // --------------------------------------------------------------------------
  // Group Bonus
  // --------------------------------------------------------------------------
  const groupBonus = puyoChains.reduce((total, chain) => {
    // @ts-ignore
    return total + groupBonusTable[chain.length];
  }, 0);

  return getPuyoScore(totalCleared, chainPower, colourBonus, groupBonus);
}

// Puyo Puyo!! 20th Anniversary - Accord
const chainPowerTable = {
  0: 0,
  1: 0,
  2: 8,
  3: 17,
  4: 23,
  5: 36,
  6: 74,
  7: 125,
  8: 192,
  9: 260,
  10: 330,
  11: 420,
  12: 512,
  13: 617,
  14: 699,
};

// Classic scoring
const colourBonusTable = {
  1: 0,
  2: 3,
  3: 6,
  4: 12,
  5: 24,
};

// Classic scoring
const groupBonusTable = {
  4: 0,
  5: 2,
  6: 3,
  7: 4,
  8: 5,
  9: 6,
  10: 7,
  11: 10,
};

import type { NextPage } from 'next';
import React from 'react';
import { MetaballTestBoard } from '../components/MetaballTestBoard';

const MetaballTestPage: NextPage = () => {
  return (
    <main className="flex min-h-screen flex-col items-center gap-4 bg-stone-900 p-8 text-stone-300">
      <h1 className="text-xl font-bold">Metaball test board</h1>
      <p className="max-w-md text-center text-sm text-stone-400">
        Static red puyos in fixed layouts (vertical pair, horizontal pair, an
        isolated ball, a diagonal pair, and a 2x2 cluster) for tuning the
        metaball merge look without needing to play the game.
      </p>

      <MetaballTestBoard />
    </main>
  );
};

export default MetaballTestPage;

import type { NextPage } from 'next';
import React from 'react';
import { useStore } from '../store/store';
import { BoardEditor } from '../components/BoardEditor';
import { InfoDialog } from '../components/InfoDialog';

const BoardEditorPage: NextPage = () => {
  const isDialogOpen = useStore((store) => store.isDialogOpen);
  const setDialogOpen = useStore((store) => store.setDialogOpen);

  return (
    <>
      <main className="h-full bg-stone-900 p-4 md:flex md:justify-center md:p-8">
        <BoardEditor />
      </main>

      <InfoDialog
        isActive={isDialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
};

export default BoardEditorPage;

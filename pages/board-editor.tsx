import type { NextPage } from 'next';
import React, { useEffect, useRef, useState } from 'react';
import { useWindowSize } from '../hooks/use-window-size';
import { useStore } from '../store/store';
import { BoardEditor } from '../components/BoardEditor';
import { BoardEditorDialog } from '../components/BoardEditorDialog';

const localWindow = typeof window === 'undefined' ? null : window;

// Mirrors pages/index.tsx's own screen/padding measuring — BoardEditor
// sizes its board using the same store.screen/store.padding values Game.tsx
// does, so this page needs to keep them updated too (unlike the game page,
// nothing else does this while /board-editor is mounted).
const BoardEditorPage: NextPage = () => {
  const isDialogOpen = useStore((store) => store.isDialogOpen);
  const setDialogOpen = useStore((store) => store.setDialogOpen);

  const setScreen = useStore((store) => store.setScreen);
  const setPadding = useStore((store) => store.setPadding);

  const mainRef = useRef<HTMLDivElement>(null);
  const mainComputedStyle = mainRef.current
    ? localWindow?.getComputedStyle(mainRef.current as Element)
    : null;
  const mainPaddingPx = mainComputedStyle?.padding;

  useEffect(() => {
    if (mainPaddingPx) {
      const mainPadding = parseInt(mainPaddingPx.replace('px', ''));
      setPadding(mainPadding);
    }
  }, [mainPaddingPx, setPadding]);

  const windowSize = useWindowSize();

  useEffect(() => {
    if (windowSize.width && windowSize.height) {
      setScreen(windowSize.width, windowSize.height);
    }
  }, [windowSize.width, windowSize.height, setScreen]);

  // Passed down from BoardEditor (which owns grid/puyos as local state)
  // rather than lifting that state up here — lets BoardEditorDialog's Save
  // button get at the current board without a bigger refactor.
  const [gridQuery, setGridQuery] = useState('');

  return (
    <>
      <main
        className="h-full bg-stone-900 p-4 md:flex md:justify-center md:p-8"
        ref={mainRef}
      >
        <BoardEditor onGridQueryChange={setGridQuery} />
      </main>

      <BoardEditorDialog
        isActive={isDialogOpen}
        onClose={() => setDialogOpen(false)}
        currentGridQuery={gridQuery}
      />
    </>
  );
};

export default BoardEditorPage;

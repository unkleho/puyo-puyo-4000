import type { NextPage } from 'next';
import React, { useEffect, useRef } from 'react';
import { useWindowSize } from '../hooks/use-window-size';
import { useStore } from '../store/store';
import { BoardEditor } from '../components/BoardEditor';
import { InfoDialog } from '../components/InfoDialog';

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

  return (
    <>
      <main
        className="h-full bg-stone-900 p-4 md:flex md:justify-center md:p-8"
        ref={mainRef}
      >
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

import type { NextPage } from 'next';
import React, { useEffect, useRef } from 'react';
import { useWindowSize } from '../hooks/use-window-size';
import { useStore } from '../store/store';
import { BoardEditor } from '../components/BoardEditor';
import { InfoDialog } from '../components/InfoDialog';

const localWindow = typeof window === 'undefined' ? null : window;

// Mirrors pages/index.tsx's own screen/padding measuring — BoardEditor's
// board is sized with the exact same formula as the real game's ThreeBoard,
// so it needs the same inputs.
const BoardEditorPage: NextPage = () => {
  const isDialogOpen = useStore((store) => store.isDialogOpen);
  const setDialogOpen = useStore((store) => store.setDialogOpen);

  const mainRef = useRef<HTMLDivElement>(null);
  const mainComputedStyle = mainRef.current
    ? localWindow?.getComputedStyle(mainRef.current as Element)
    : null;
  const mainPaddingPx = mainComputedStyle?.padding;

  const [padding, setPadding] = React.useState(16);

  useEffect(() => {
    if (mainPaddingPx) {
      const mainPadding = parseInt(mainPaddingPx.replace('px', ''));
      setPadding(mainPadding);
    }
  }, [mainPaddingPx]);

  const windowSize = useWindowSize();

  return (
    <>
      <main
        className="h-full bg-stone-900 p-4 md:flex md:justify-center md:p-8"
        ref={mainRef}
      >
        <BoardEditor
          screen={{
            width: windowSize.width || 0,
            height: windowSize.height || 0,
          }}
          padding={padding}
        />
      </main>

      <InfoDialog
        isActive={isDialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
};

export default BoardEditorPage;

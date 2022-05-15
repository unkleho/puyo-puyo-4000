import type { NextPage } from 'next';
import React, { useEffect, useRef } from 'react';
import { useWindowSize } from '../hooks/use-window-size';
import { useStore } from '../store/store';
import { InfoDialog } from '../components/InfoDialog';
import { Game } from '../components/Game';
import Blob from '../components/Blob/Blob';

const localWindow = typeof window === 'undefined' ? null : window;

const Home: NextPage = () => {
  const isDialogOpen = useStore((store) => store.isDialogOpen);

  const setScreen = useStore((store) => store.setScreen);
  const setPadding = useStore((store) => store.setPadding);
  const setDialogOpen = useStore((store) => store.setDialogOpen);

  // Measure padding on <main> to help set ThreeBoard canvas width/height
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

  // iPhone Mini Viewport 375 x 610
  const windowSize = useWindowSize();

  useEffect(() => {
    if (windowSize.width && windowSize.height) {
      setScreen(windowSize.width, windowSize.height);
    }
  }, [windowSize.width, windowSize.height, setScreen]);

  return (
    <>
      <main
        className={'h-full bg-stone-900 p-4 md:flex md:justify-center md:p-8'}
        ref={mainRef}
      >
        <Game />
      </main>

      <InfoDialog
        isActive={isDialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
};

export default Home;

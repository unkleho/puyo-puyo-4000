import { AnimatePresence, motion } from 'framer-motion';
import type { NextPage } from 'next';
import React, { useEffect, useState } from 'react';
import { MemoBoard as Board } from '../components/Board';
import { Puyo } from '../components/Puyo';
import { Queue } from '../components/Queue';
import { useKeyPress } from '../hooks/use-key-press';
import { PuyoColour, useStore } from '../store/store';
import styles from '../styles/Home.module.css';

const tickSpeed = 500;

const Home: NextPage = () => {
  const grid = useStore((store) => store.grid);
  const gameState = useStore((store) => store.gameState);

  const startGame = useStore((store) => store.startGame);
  const togglePauseGame = useStore((store) => store.togglePauseGame);
  const movePuyos = useStore((store) => store.movePuyos);
  const rotatePuyos = useStore((store) => store.rotatePuyos);
  const addPuyosToGrid = useStore((store) => store.addPuyosToGrid);
  const clearPuyos = useStore((store) => store.clearPuyos);
  const collapsePuyos = useStore((store) => store.collapsePuyos);

  useKeyPress('ArrowLeft', () => {
    movePuyos('left');
  });

  useKeyPress('ArrowRight', () => {
    movePuyos('right');
  });

  useKeyPress('ArrowUp', () => {
    rotatePuyos();
  });

  useKeyPress('ArrowDown', () => {
    movePuyos('down');
  });

  useEffect(() => {
    let interval: number = 0;

    if (gameState === 'start') {
      addPuyosToGrid();
    } else if (gameState === 'drop-puyos') {
      interval = window.setInterval(() => {
        console.log('interval', interval);

        movePuyos('down');
      }, tickSpeed);
    } else if (gameState === 'paused') {
      window.clearInterval(interval);
    } else if (gameState === 'landed-puyos') {
      window.clearInterval(interval);

      window.setTimeout(() => {
        collapsePuyos();
      }, tickSpeed);
    } else if (gameState === 'collapse-puyos') {
      window.setTimeout(() => {
        collapsePuyos();
      }, tickSpeed);
    } else if (gameState === 'clear-puyos') {
      window.setTimeout(() => {
        clearPuyos();
      }, tickSpeed);
    } else if (gameState === 'add-puyos') {
      addPuyosToGrid();
    }

    return () => {
      window.clearInterval(interval);
    };
  }, [gameState, movePuyos, addPuyosToGrid, clearPuyos, collapsePuyos]);

  return (
    <main className={'grid place-content-center h-full bg-slate-800'}>
      <div className="flex mb-4">
        <Board grid={grid} className="mr-4"></Board>

        <Queue />
      </div>
      <button onClick={() => startGame()}>Start</button>
      <button onClick={() => togglePauseGame()}>Pause</button>

      <p className="mt-4 uppercase text-sm">{gameState}</p>
    </main>
  );
};

export default Home;

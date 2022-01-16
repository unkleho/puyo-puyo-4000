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
  const cellSize = useStore((store) => store.cellSize);
  const grid = useStore((store) => store.grid);
  const rows = useStore((store) => store.rows);
  // const puyos = useStore((store) => store.puyos);
  const gameState = useStore((store) => store.gameState);
  const togglePauseGame = useStore((store) => store.togglePauseGame);
  const movePuyo = useStore((store) => store.movePuyo);
  const rotatePuyo = useStore((store) => store.rotatePuyo);
  const addPuyoToGrid = useStore((store) => store.addPuyoToGrid);
  const clearPuyos = useStore((store) => store.clearPuyos);
  const collapsePuyos = useStore((store) => store.collapsePuyos);

  useKeyPress('ArrowLeft', () => {
    movePuyo('left');
  });

  useKeyPress('ArrowRight', () => {
    movePuyo('right');
  });

  useKeyPress('ArrowUp', () => {
    rotatePuyo();
  });

  useKeyPress('ArrowDown', () => {
    movePuyo('down');
  });

  useEffect(() => {
    let interval: number = 0;

    if (gameState === 'drop-puyo') {
      interval = window.setInterval(() => {
        movePuyo('down');
      }, tickSpeed);
    } else if (gameState === 'paused') {
      window.clearInterval(interval);
    } else if (gameState === 'landed') {
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
      addPuyoToGrid();
    }

    return () => {
      window.clearInterval(interval);
    };
  }, [gameState, movePuyo, addPuyoToGrid, clearPuyos, collapsePuyos]);

  // console.log(grid);
  // console.log(gameState, grid);

  const gridTest = grid.reduce((prev, curr) => {
    return [...prev, ...curr];
  }, []);

  // console.log(gridTest);

  return (
    <div className={styles.container}>
      <div className="flex">
        <Board grid={grid}></Board>

        {gameState}
        <Queue />
        <button onClick={() => togglePauseGame()}>Pause</button>
      </div>
    </div>
  );
};

export default Home;

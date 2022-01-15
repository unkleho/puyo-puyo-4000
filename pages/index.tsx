import { AnimatePresence } from 'framer-motion';
import type { NextPage } from 'next';
import React, { useEffect, useState } from 'react';
import { Board } from '../components/Board';
import { Puyo } from '../components/Puyo';
import { Queue } from '../components/Queue';
import { useKeyPress } from '../hooks/use-key-press';
import { PuyoColour, useStore } from '../store/store';
import styles from '../styles/Home.module.css';

const Home: NextPage = () => {
  const cellSize = useStore((store) => store.cellSize);
  const grid = useStore((store) => store.grid);
  const rows = useStore((store) => store.rows);
  const puyos = useStore((store) => store.puyos);
  const gameState = useStore((store) => store.gameState);
  const togglePauseGame = useStore((store) => store.togglePauseGame);
  const movePuyo = useStore((store) => store.movePuyo);
  const rotatePuyo = useStore((store) => store.rotatePuyo);
  const addPuyoToGrid = useStore((store) => store.addPuyoToGrid);

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
      }, 1000);
    } else if (gameState === 'paused') {
      window.clearInterval(interval);
    } else if (gameState === 'landed') {
      window.clearInterval(interval);
      addPuyoToGrid();
    }

    return () => {
      window.clearInterval(interval);
    };
  }, [gameState, movePuyo, addPuyoToGrid]);

  console.log(grid);

  return (
    <div className={styles.container}>
      <div className="flex">
        <Board>
          <AnimatePresence>
            {grid.map((columns, row) => {
              return columns.map((id, column) => {
                if (id) {
                  const puyo = puyos[id];

                  return (
                    <Puyo
                      id={id}
                      colour={puyo.colour}
                      // state={puyo.state}
                      x={column * cellSize}
                      y={row * cellSize}
                      key={id}
                    />
                  );
                }

                return null;
              });
            })}
          </AnimatePresence>
        </Board>

        {gameState}
        <Queue />
        <button onClick={() => togglePauseGame()}>Pause</button>
      </div>
    </div>
  );
};

export default Home;

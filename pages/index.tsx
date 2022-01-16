import { AnimatePresence, motion } from 'framer-motion';
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
      }, 1000);
    } else if (gameState === 'paused') {
      window.clearInterval(interval);
    } else if (gameState === 'landed') {
      window.clearInterval(interval);

      window.setTimeout(() => {
        collapsePuyos();
      }, 1000);
    } else if (gameState === 'collapse-puyos') {
      collapsePuyos();
      // window.setTimeout(() => {
      // }, 1000);
    } else if (gameState === 'clear-puyos') {
      window.setTimeout(() => {
        clearPuyos();
      }, 1000);
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

  console.log(gridTest);

  return (
    <div className={styles.container}>
      <div className="flex">
        <Board>
          <AnimatePresence>
            {/* {gameState === 'add-puyos' && (
              <Puyo id="test" colour={PuyoColour.BLUE}></Puyo>
            )}
            {gameState === 'drop-puyo' && (
              <Puyo id="test" colour={PuyoColour.GREEN}></Puyo>
            )} */}

            {gridTest.map((id, index) => {
              if (id) {
                const puyo = puyos[id];
                const column = index % 6;
                const row = Math.floor(index / 6);

                return (
                  <Puyo
                    id={id}
                    colour={puyo.colour}
                    x={column * cellSize}
                    y={row * cellSize}
                    key={id}
                  />
                );
              }

              return null;
            })}

            {/* {grid.map((columns, row) => {
              return columns.map((id, column) => {
                if (id) {
                  const puyo = puyos[id];

                  return (
                    <Puyo
                      id={id}
                      colour={puyo.colour}
                      x={column * cellSize}
                      y={row * cellSize}
                      key={id}
                    />
                  );
                }

                return null;
              });
            })} */}
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

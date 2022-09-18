import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import styles from './Game.module.scss';
import { throwDices } from '../../controller/throwDices';
import { initDices, initFaces } from '../../model/init/init';
import { pickingCards } from '../../controller/pickingCards';
import Counter from '../../components/counter/counter.js';
import Dice from '../../components/dice/dice.js';

const Game = () => {
  const [turn, setTurn] = useState(0);
  const handleDices = () => {
    // if you get 3 skull at the fisrt turn then you loose
    // if you get 4 skull at the first turn then you pass ti the dark side
    setTurn((count) => count + 1);
    throwDices(turn + 1);
  };

  const handleCards = () => {
    pickingCards();
  };

  return (
    <div>
      <Head>
        <title>Mille Sabords - Home</title>
        <meta
          name="description"
          content="Mille Sabords - Le Trésor se gagne aux dés"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header>
        <div className="players">
          <div>
            Number of turn: <span>{turn}</span>
          </div>
        </div>
      </header>
      <div className={styles.gamePad}>
        <div>
          <button
            id="pickCard"
            onClick={handleCards}
            className={styles.pickCard}
          >
            Picking a Card
          </button>

          <button
            id="dropDicesBtn"
            onClick={handleDices}
            className={styles.dropDicesBtn}
          >
            Drop the Dices
          </button>
        </div>
        <div>
          <div className="card"></div>
          <ul id="list-dices" className={styles.listDices}></ul>
          <ul className={styles.listDices} id="bucket-list"></ul>
          <div>
            Points : <Counter />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;

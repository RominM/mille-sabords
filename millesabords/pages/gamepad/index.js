import React, { useState } from 'react';
import Head from 'next/head';
import Counter from '../../components/counter/counter.js';
import { throwDices } from '../../controller/throwDices';
import { getRandomCard } from '../../controller/getRandomCard.js';
import Player from '../../components/player/Player.js';
import Header from '../../components/header/Header.js';
import styles from './Game.module.scss';

const Game = () => {
  const [turn, setTurn] = useState(0);
  const [card, setCard] = useState();

  const handleDices = () => {
    setTurn((turn) => turn + 1);
    throwDices(turn + 1);
  };

  const handleCards = () => {
    getRandomCard(setCard);
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

      <Header turn={turn} />
      {/* header */}

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
          <div className="card">{card}</div>
          <ul id="list-dices" className={styles.listDices}></ul>
          <ul className={styles.listDices} id="bucket-list"></ul>
        </div>
      </div>
    </div>
  );
};

export default Game;

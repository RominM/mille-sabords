import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import styles from './Game.module.scss';
import { dropDices } from '../../controller/dropDices';

const Game = () => {
  /*
  const dicesValues = ['Gold', 'Diamond', 'Parrot', 'Monkey', 'Saber', 'Skull'];
  const random = Math.floor(Math.random() * dicesValues.length);
  const randomly = dicesValues[random];
  console.log(randomly);

  */
  const [dices, setDices] = useState({
    d1: null,
    d2: null,
    d3: null,
    d4: null,
    d5: null,
    d6: null,
    d7: null,
    d8: null,
  });
  const handleDices = () => {
    dropDices(setDices);
  };
  /*
  const handleDices = () => {
    dropDices();
  };
*/
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
      <div className={styles.gamePad}>
        <button id="playBtn" onClick={handleDices} className={styles.playBtn}>
          Play
        </button>
        <span>Result : </span>
        <ul className="list-dices">
          {Object.keys(dices).map((dice, i) => (
            <li key={i} className="dice turn">
              {dices[dice]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Game;

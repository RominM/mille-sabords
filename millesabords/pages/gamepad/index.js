import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import styles from './Game.module.scss';
import { dropDices } from '../../controller/dropDices';
import { initDices } from '../../model/init/init';
import { pickingCards } from '../../controller/pickingCards';

const Game = () => {
  /*
  const dicesValues = ['Gold', 'Diamond', 'Parrot', 'Monkey', 'Saber', 'Skull'];
  const random = Math.floor(Math.random() * dicesValues.length);
  const randomly = dicesValues[random];
  console.log(randomly);

  */

  const [dices, setDices] = useState(initDices);
  const handleDices = () => {
    dropDices(setDices);
  };

  const handleCards = () => {
    pickingCards();
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

      <header>
        <div className="players">
          
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
          <ul className="list-dices">
            {Object.keys(dices).map((dice, i) => (
              <li key={i} className="dice turn">
                {dices[dice]}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Game;

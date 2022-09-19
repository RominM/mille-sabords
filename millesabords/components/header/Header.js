import React from 'react';
import Player from '../player/Player';
import styles from './Header.module.scss';

const Header = (props) => {
  const turn = props.turn;
  return (
    <header className={styles.header}>
      <div className={styles.turn}>
        Number of turn: <span>{turn}</span>
      </div>
      <ul className={styles.players}>
        <Player />
      </ul>
    </header>
  );
};

export default Header;

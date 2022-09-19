import React, { useState } from 'react';
import styles from './Player.module.scss';

const Player = () => {
  const [points, setPoints] = useState(0);

  return (
    <li className={styles.player}>
      <h2>Player name</h2>
      <div>On turn/ On wait</div>
      <div>
        Points : <span>{points}</span>
      </div>
      {/* <div>Bucket List</div> */}
    </li>
  );
};

export default Player;

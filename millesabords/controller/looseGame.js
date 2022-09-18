export const looseGame = (diceInBucketlist, turn) => {
  let skullDice = [];
  diceInBucketlist.forEach((dice) => {
    if (turn === 1) {
      // you get 3 skulls, the You Loose
      diceInBucketlist.length === 3 && console.log('YOU LOOSE !');
      // you get more than 3 skulls, you pass into the dark side
      // you take points to your adversers
      diceInBucketlist.length > 3 && console.log('PASS TO THE DARK SIDE');
    }
    if (turn > 1) {
      // If you get 3 skulls during the game, then You Loose
      const skull = dice.classList.contains('skull');
      if (skull) {
        skullDice.push(dice);
        skullDice.length > 2 && console.log('YOU LOOSE ?!');
      }
    }
  });
};

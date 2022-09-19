export const looseGame = (diceInBucketlist, turn) => {
  let skullDice = [];
  diceInBucketlist.forEach((dice) => {
    if (turn === 1) {
      diceInBucketlist.length === 3 && console.log('YOU LOOSE !');
      diceInBucketlist.length > 3 && console.log('PASS TO THE DARK SIDE');
    }
    if (turn > 1) {
      const skull = dice.classList.contains('skull');
      if (skull) {
        skullDice.push(dice);
        skullDice.length > 2 && console.log('YOU LOOSE !');
      }
    }
  });
};

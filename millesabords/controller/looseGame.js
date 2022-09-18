export const looseGame = (diceInBucketlist, turn) => {
  if (diceInBucketlist.length) {
    let skullDice = [];
    diceInBucketlist.forEach((dice) => {
      skullDice.push(dice.classList.contains('skull'));

      //TODO Have to check if is only skulls is verify
      function allAreTruthy(skullDice) {
        return skullDice.every((el) => el);
      }
      console.log(allAreTruthy(skullDice));

      // if at the first turn
      if (turn === 1) {
        // you get 3 skulls, the You Loose
        skullDice.length === 3 && console.log('YOU LOOSE !');
        // you get more than 3 skulls, you pass into the dark side
        skullDice.length > 3 && console.log('PASS TO THE DARK SIDE');
        // you take points to your adversers
      }
      if (turn > 1) {
        // If you get 3 skulls during the game, then You Loose
        skullDice.length > 2 && console.log('YOU LOOSE !');
      }
    });
  }
};

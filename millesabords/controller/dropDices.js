export const dropDices = (setDices) => {
  const dicesValues = ['Gold', 'Diamond', 'Parrot', 'Monkey', 'Saber', 'Skull'];

  const listDice = document.querySelector('.list-dices');
  console.log(listDice);
  // will exist after the first turn
  const turnDice = document.querySelectorAll('.turn');
  // listDice.innerHTML = '';

  // it will check if turn exist from the previous turn
  let thow = [];
  if (!turnDice.length) {
    // is the first turn
    // turn on all of dice
    for (let i = 0; i < 8; i++) {
      turnLoop(dicesValues, thow, turnDice);
    }
  } else {
    // turn only on the dices with "turn" class. Not "blocked" (skull) or "selected" (points)
    for (let i = 0; i < turnDice.length; i++) {
      turnLoop(dicesValues, thow, turnDice);
    }
  }
  setDices(thow);
};

const turnLoop = (dicesValues, thow, turnDice) => {
  // find randomly the dices
  const random = Math.floor(Math.random() * dicesValues.length);
  const randomly = dicesValues[random];
  thow.push(randomly);

  if (turnDice.innerHTML === 'Skull') {
    turnDice.classList.remove('turn');
    console.log(turnDice);
  }
  // const diceElement = document.querySelector('.dice');
  // diceElement.classList.add('dice-el', 'turn');
  // diceElement.innerHTML = randomly;
  // diceElement.addEventListener('click', () => {
  //   selectDices(diceElement);
  // });

  // if skulls on turn
  // checkSkulls(diceElement, randomly);

  // listDice.append(diceElement);
};

const checkSkulls = (diceElement, randomly) => {
  if (randomly === 'Skull') {
    diceElement.classList.add('dice-el', 'blocked');
    diceElement.classList.remove('turn');
  }
  // if you get 3 skulls throw at the first drop, you loose immediatly
  // if you get 4 skulls throw at the first drop, you can play all time you have a new skull. You take off 100 pts to your adverse by skull.
};

const selectDices = (diceElement) => {
  switch (diceElement.innerHTML) {
    case 'Gold': {
      diceElement.classList.add('selected');
      diceElement.classList.remove('turn');

      console.log(
        'you selected ' + diceElement.innerHTML + ' ' + diceElement.classList
      );
      break;
    }
    case 'Diamond': {
      diceElement.classList.add('selected');
      diceElement.classList.remove('turn');

      console.log(
        'you selected ' + diceElement.innerHTML + ' ' + diceElement.classList
      );
      break;
    }
    case 'Parrot': {
      diceElement.classList.add('selected');
      diceElement.classList.remove('turn');

      console.log(
        'you selected ' + diceElement.innerHTML + ' ' + diceElement.classList
      );
      break;
    }
    case 'Monkey': {
      diceElement.classList.add('selected');
      diceElement.classList.remove('turn');

      console.log(
        'you selected ' + diceElement.innerHTML + ' ' + diceElement.classList
      );
      break;
    }
    case 'Saber': {
      diceElement.classList.add('selected');
      diceElement.classList.remove('turn');

      console.log(
        'you selected ' + diceElement.innerHTML + ' ' + diceElement.classList
      );
      break;
    }
    case 'Skull': {
      diceElement.classList.add('selected');
      diceElement.classList.remove('turn');

      console.log(
        'you selected ' + diceElement.innerHTML + ' ' + diceElement.classList
      );
      break;
    }
  }
};

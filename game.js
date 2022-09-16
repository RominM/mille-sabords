const game = () => {
  // 6 faces of dices
  const dicesValues = ['Gold', 'Diamond', 'Parrot', 'Monkey', 'Saber', 'Skull'];

  const playBtn = document.querySelector('#playBtn');
  playBtn.addEventListener('click', () => {
    dropDices(dicesValues);
  });
};

const dropDices = (dicesValues) => {
  const listDice = document.querySelector('.list-dices');
  // will exist after the first turn
  const turnDice = document.querySelectorAll('.turn');
  listDice.innerHTML = '';

  // it will check if turn exist from the previous turn
  if (!turnDice.length) {
    // is the first turn
    // turn on all of dice
    for (let i = 0; i < 8; i++) {
      turnLoop(dicesValues, listDice);
    }
  } else {
    // turn only on the dices with "turn" class. Not "blocked" (skull) or "selected" (points)
    for (let i = 0; i < turnDice.length; i++) {
      turnLoop(dicesValues, listDice);
    }
  }
};

const turnLoop = (dicesValues, listDice) => {
  // find randomly the dices
  const random = Math.floor(Math.random() * dicesValues.length);
  const randomly = dicesValues[random];

  const diceElement = document.createElement('li');
  diceElement.classList.add('dice-el', 'turn');
  diceElement.innerHTML = randomly;
  diceElement.addEventListener('click', () => {
    selectDices(diceElement);
  });

  // if skulls on turn
  checkSkulls(diceElement, randomly);

  listDice.append(diceElement);
};

const checkSkulls = (diceElement, randomly) => {
  if (randomly === 'Skull') {
    diceElement.classList.add('dice-el', 'blocked');
    diceElement.classList.remove('turn');
  }
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

game();

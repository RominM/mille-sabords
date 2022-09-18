import { initFaces } from '../model/init/init';

export const throwDices = (turn) => {
  const listDices = document.querySelector('#list-dices');
  const bucketList = document.querySelector('#bucket-list');

  // will exist after the first turn
  const turnDice = document.querySelectorAll('.turn');
  const turnLength = turnDice.length;
  // it will check if turn exist from the previous turn
  listDices.innerHTML = '';

  if (turnLength <= 1 && turnLength > 0) {
    alert('END OF TURN');
  } else if (!turnLength) {
    // is the first turn
    // turn on all of dice

    for (let i = 0; i < 8; i++) {
      turnLoop(initFaces, listDices, bucketList);
    }
  } else {
    // turn only on the dices with "turn" class. Not "blocked" (skull) or "selected" (points)
    for (let i = 0; i < turnDice.length; i++) {
      turnLoop(initFaces, listDices, bucketList);
    }
  }
  loose(bucketList, turn);
};

const turnLoop = (initFaces, listDices, bucketList) => {
  // find name the dices
  const random = Math.floor(Math.random() * initFaces.length);
  const name = initFaces[random].name;

  const diceElement = document.createElement('div');
  // diceElement.classList.add('dice-el','turn','turn');
  // diceElement.innerHTML = name;
  diceElement.addEventListener('click', () => {
    selectDices(bucketList, diceElement, name);
  });
  const diceImg = document.createElement('img');
  diceImg.src = initFaces[random].image;

  // if skulls on turn
  diceElement.append(diceImg);
  listDices.append(diceElement);
  handleDicesValue(bucketList, diceElement, name);
};

const handleDicesValue = (bucketList, diceElement, name) => {
  // if (name === 'skull') {
  // }

  switch (name) {
    case 'gold': {
      diceElement.classList.add('dice-el', 'turn', 'gold');

      break;
    }
    case 'diamond': {
      diceElement.classList.add('dice-el', 'turn', 'diamond');

      break;
    }
    case 'parrot': {
      diceElement.classList.add('dice-el', 'turn', 'parrot');

      break;
    }
    case 'monkey': {
      diceElement.classList.add('dice-el', 'turn', 'monkey');

      break;
    }
    case 'saber': {
      diceElement.classList.add('dice-el', 'turn', 'saber');

      break;
    }
    case 'skull': {
      diceElement.classList.add('dice-el', 'blocked', 'skull');
      bucketList.append(diceElement);

      break;
    }
  }
  // if you get 3 skulls throw at the first drop, you loose immediatly
  // if you get 4 skulls throw at the first drop, you can play all time you have a new skull. You take off 100 pts to your adverse by skull.
};

const selectDices = (bucketList, diceElement, name) => {
  switch (name) {
    case 'gold': {
      diceElement.classList.add('selected');
      diceElement.classList.remove('turn');
      bucketList.append(diceElement);
      break;
    }
    case 'diamond': {
      diceElement.classList.add('selected');
      diceElement.classList.remove('turn');
      bucketList.append(diceElement);
      break;
    }
    case 'parrot': {
      diceElement.classList.add('selected');
      diceElement.classList.remove('turn');
      bucketList.append(diceElement);
      break;
    }
    case 'monkey': {
      diceElement.classList.add('selected');
      diceElement.classList.remove('turn');
      bucketList.append(diceElement);
      break;
    }
    case 'saber': {
      diceElement.classList.add('selected');
      diceElement.classList.remove('turn');
      bucketList.append(diceElement);
      break;
    }
    case 'skull': {
      diceElement.classList.add('selected');
      diceElement.classList.remove('turn');
      bucketList.append(diceElement);
      break;
    }
  }
  /* TODO
   ** Doesn't work at the moment
   ** Have to "deselect" the element
   */

  const selected = document.querySelector('.selected');
  selected.addEventListener('click', () => {
    selected.classList.remove('selected');
    selected.classList.add('turn');
    bucketList.removeChild(selected);
    listDices.append(selected);
  });
};

const loose = (bucketList, turn) => {
  if (bucketList.childNodes.length) {
    if (turn === 1 && bucketList.childNodes.length) {
      const childs = bucketList.childNodes;
      let skullChild = [];
      childs.forEach((child) => {
        skullChild.push(child.classList.contains('skull'));
        console.log(skullChild);
        skullChild.length === 3 && console.log('YOU LOOSE !');
        // in the dark side, you take points to your adversers
        skullChild.length > 3 && console.log('PASS TO THE DARK SIDE');
      });
    }
  }
};

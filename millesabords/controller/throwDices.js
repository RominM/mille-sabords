import { initFaces } from '../model/init/init';
import { looseGame } from '../controller/looseGame.js';
import { selectDice } from './selectedDice';

export const throwDices = (turn) => {
  const listDices = document.querySelector('#list-dices');
  const bucketList = document.querySelector('#bucket-list');

  // will exist after the first turn
  const diceInGame = document.querySelectorAll('.turn');
  // clear the list before each turn
  listDices.innerHTML = '';

  if (diceInGame.length <= 2 && diceInGame.length > 0) {
    alert('END OF TURN');
  } else if (!diceInGame.length) {
    for (let i = 0; i < 8; i++) {
      turnLoop(initFaces, listDices, bucketList);
    }
  } else {
    for (let i = 0; i < diceInGame.length; i++) {
      turnLoop(initFaces, listDices, bucketList);
    }
  }
  const diceInBucketlist = bucketList.childNodes;
  looseGame(diceInBucketlist, turn);
};

const turnLoop = (initFaces, listDices, bucketList) => {
  // find name the dices
  const random = Math.floor(Math.random() * initFaces.length);
  const name = initFaces[random].name;

  const diceElement = document.createElement('div');
  // diceElement.classList.add('dice-el','turn','turn');
  // diceElement.innerHTML = name;
  diceElement.addEventListener('click', () => {
    selectDice(bucketList, diceElement, name);
  });
  const diceImg = document.createElement('img');
  diceImg.src = initFaces[random].image;

  // if skulls on turn
  diceElement.append(diceImg);
  listDices.append(diceElement);
  handleDicesValue(bucketList, diceElement, name);
};

const handleDicesValue = (bucketList, diceElement, name) => {
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
};

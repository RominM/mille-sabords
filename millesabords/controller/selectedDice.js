export const selectDice = (bucketList, diceElement, name) => {
  switch (name) {
    case 'gold': {
      diceElement.classList.add('selected');
      diceElement.classList.remove('turn');
      console.log(diceElement);
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

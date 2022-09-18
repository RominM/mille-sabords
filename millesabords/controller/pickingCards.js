import { initCards } from '../model/init/init';

export const pickingCards = () => {
  // const listCards = document.querySelector('.list-cards');
  const card = document.querySelector('.card');

  const random = Math.floor(Math.random() * initCards.length);

  const name = initCards[random].name;
  const points = initCards[random].points;
  const penality = initCards[random].penality.value;

  if (points) {
    card.innerHTML = name + ' ' + points;
  } else if (penality) {
    card.innerHTML = name + ' ' + penality;
  } else {
    card.innerHTML = name;
  }
};

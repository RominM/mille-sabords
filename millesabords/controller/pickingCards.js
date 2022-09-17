import { initCards } from '../model/init/init';

export const pickingCards = () => {
  const listCards = document.querySelector('.list-cards');
  const card = document.querySelector('.card');

  const random = Math.floor(Math.random() * initCards.length);
  const randomly = initCards[random].name;

  card.innerHTML = randomly;
  console.log(randomly);
  // listCards.append(card);
  /*
  initCards.map((initCard) => {
    card.innerHTML = initCard.name;
  });
*/
};

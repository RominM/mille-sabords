import { initCards } from '../model/init/init';

export const getRandomCard = (setCard) => {
  const randomCard = Math.floor(Math.random() * initCards.length);
  const name = initCards[randomCard].name;
  const points = initCards[randomCard].points;
  const penality = initCards[randomCard].penality.value;

  if (points) {
    const value = name + ' ' + points;
    setCard(value);
  } else if (penality) {
    const value = name + ' ' + penality;
    setCard(value);
  } else {
    const value = name;
    setCard(value);
  }
};

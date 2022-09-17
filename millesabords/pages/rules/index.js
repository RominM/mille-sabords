import Link from 'next/Link';
import React from 'react';

const Rules = () => {
  return (
    <div>
      <Link href="/home">
        <a>Back to the Home page</a>
      </Link>
      <h2>CARDS:</h2>
      <ul>
        <li>4 x Diamond = 100 pts</li>
        <li>4 x Gold = 100 pts</li>
        <li>4 x Treasure = Keep every point you win until 3 skulls</li>
        <li>
          4 x Monkey&Parrot = Monkey and Parrot on dice have the same value
        </li>
        <li>4 x Pirate = Double point</li>
        <li>4 x Witcher = Can deleted a skull in your round (one time)</li>
        <li>
          2 x Challenge_2 = Win 300 pts if you throw 2 sabers (-300 pts if you
          loose)
        </li>
        <li>
          2 x Challenge_3 = Win 500 pts if you throw 3 sabers (-500 pts if you
          loose)
        </li>
        <li>
          2 x Challenge_4 = Win 1000 pts if you throw 4 sabers (-1000 pts if you
          loose)
        </li>
        <li>
          3 x Skull_1 = Begin the round with one skull 2 x Skull_2 = Begin the
          round with two skulls
        </li>
      </ul>
      <h2>DICES FACES:</h2>
      <div>
        8 dices
        <ul>
          <li>Gold</li>
          <li>Diamond</li>
          <li>Parrot</li>
          <li>Monkey</li>
          <li>Saber</li>
          <li>Skull</li>
        </ul>
      </div>

      <h2>RULES:</h2>
      <div>
        <div>Min 2 Players</div>
        <div>Max 5 Players</div>
        <ul>
          <li>Gold = 100 pts</li>
          <li>Diamond = 100 pts</li>
          <li>3 Same = 100 pts more</li>
          <li>4 Same = 200 pts more</li>
          <li>5 Same = 500 pts more</li>
          <li>6 Same = 1000 pts more</li>
          <li>7 Same = 2000 pts more</li>
          <li>8 Same = 4000 pts more</li>
        </ul>
        <div>
          If all your dice give points, you win 500 pts bonus If you get 4
          skulls to the first throw, you can play all time you have a new skull.
          You take off 100 pts to your adverse by skull. You can throw minimum 2
          dices at the same time.
        </div>
        <h3>exemple of round:</h3>
        <div>
          You pull a card, that give you the sens of your round (ex: get Diamond
          Throw the 8 dices. You have: 1 Skull + 2 Diamonds + 3 Parrots + 1 Gold
          + 1 Monkey You can stop the game and make total of point you win. In
          this case, you have 3 Diamonds and 1 Gold, so you win 500 pts (2
          dices(200) + you card(100) = it give you 3 Diamonds so you win 100 pts
          more + 1 Gold(100)).
        </div>
        <div>
          But you have skull, get 2 skulls more to over in the turn. //OR you
          can keep any dice you want and throw the other one all the time you
          want. But, you have to keep the skull dice, it over. )
        </div>
        <h2>INDEX:</h2>
        <div>
          Input to enter the name of player Button to validate the name Save the
          player in the column and hold Minimal two (Max 5) player are required
          fo the button to be available After clic, come in to the game Wait few
          seconds to get all the players The game can be start The player 1 must
          be selected randomly The player 1 get he's first card and can throw
          the dice Is free to play until he can't continue then is the Player 2
          turn etc..
        </div>
      </div>
    </div>
  );
};

export default Rules;

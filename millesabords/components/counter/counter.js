import React, { useEffect, useState } from 'react';

const Counter = () => {
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const dice = document.querySelector('.turn');
    dice &&
      dice.addEventListener('click', () => {
        setCounter((counter += 100));
      });
  }, [counter]);

  // console.log(counter);

  return <span>{counter}</span>;
};

export default Counter;

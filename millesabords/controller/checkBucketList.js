export const checkBuckList = (turn) => {
  const bucketList = document.querySelector('#bucket-list');
  const childs = [bucketList.childNodes];

  let skullChild = [];
  childs.forEach((child) => {
    skullChild.push(child);
    // if (child.classLit.contains('skull')) {
    //   console.log('yes');
    // }
    console.log('child ', child);
    // skullChild.push(child.classList.contains('skull'));
  });
  console.log('skullChild : ',skullChild);

  /*
  console.log('node list ', childs);
  childs.forEach((child) => {
    console.log('child ', child);
    if (turn === 1) {
      console.log('it is the first tour', child);
    }
    if (turn > 2) {
      console.log('it is not the first tour', child);
    }
  });

  if (turn == 1) {
    childs.forEach((child) => {
      skullChild.push(child.classList.contains('skull'));
      console.log('nmb of skull ', skullChild.length);
      skullChild.length === 3 && console.log('YOU LOOSE !');
      // Only on the first turn
      // in the dark side, you take points to your adversers
      skullChild.length > 3 && console.log('PASS TO THE DARK SIDE');
    });
  }

  if (turn > 1) {
    childs.forEach((child) => {
      skullChild.push(child.classList.contains('skull'));
      console.log('nmb of skull ', skullChild.length);
      skullChild.length > 3 && console.log('YOU LOOSE !');
    });
  }
  */
  console.log('turn: ', turn);
};

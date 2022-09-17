describe('Given I start a Game', () => {
  test('My Nickname should be validate', () => {
    const nicknameValue = (callback, nickname) => {
      (nickname == 'validate') & callback(nickname);
    };
    const checkNickname = jest.fn();
    nicknameValue(checkNickname, 'nickname');
    expect(checkNickname).toHaveBeenCalled();
  });
  describe('When I enter to the GamePad', () => {
    test('The numbers of players should be 2 at least', () => {
      const nmbPlayersOnline = 3;
      expect(nmbPlayersOnline).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('Given I would join the game', () => {
  describe('When I enter the referal link', () => {
    test('I should verify the referal-link', () => {
      //test
    });
  });
});

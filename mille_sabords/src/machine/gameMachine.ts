import { createMachine } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { Card, Dice, Player } from '../types';

enum GameStates {
  LOBBY = 'LOBBY',
  PLAY = 'PLAY',
  VICTORY = 'VICTORY',
}

export const GameModel = createModel({
  players: [] as Player[],
  currentPlayer: null as null | Player['id'],
  dices: [] as Dice[],
  cards: [] as Card[],
});
export const GameMachine = createMachine({
  id: 'game',
  initial: GameStates.LOBBY,
  states: {
    [GameStates.LOBBY]: {
      on: {
        join: {
          target: GameStates.LOBBY,
        },
        leave: {
          target: GameStates.LOBBY,
        },
        start: {
          target: GameStates.PLAY,
        },
      },
    },
    [GameStates.PLAY]: {
      on: {
        card: {
          target: '???',
        },
        dropDices: {
          target: '???',
        },
      },
    },
    [GameStates.VICTORY]: {
      on: {
        restart: {
          target: GameStates.LOBBY,
        },
      },
    },
  },
});

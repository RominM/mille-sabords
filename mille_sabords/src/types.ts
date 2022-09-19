export type Player = {
  id: string;
  name: string;
};

export type Card = {
  id: string;
  name: string;
  points: number;
  image: string;
  penality: {
    value: string | null;
  };
  advantage: {
    value: string | null;
  };
};

export type Dice = {
  id: string;
  name: string;
  image: string;
  value: number;
};

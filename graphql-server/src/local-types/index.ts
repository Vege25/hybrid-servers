import {TokenContent} from '@sharedTypes/DBTypes';

type UserFromToken = TokenContent & {
  token: string;
};

type MyContext = {
  user?: UserFromToken;
};

export type {MyContext, UserFromToken};

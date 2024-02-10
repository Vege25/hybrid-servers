import {TokenContent} from '@sharedTypes/DBTypes';

type UserFromToken = TokenContent & {
  token: string;
};

type MyContext = {
  user?: UserFromToken;
};

type FileInput = {
  file: File;
};

export type {MyContext, FileInput, UserFromToken};

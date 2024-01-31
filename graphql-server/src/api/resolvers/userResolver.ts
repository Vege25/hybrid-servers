import {User, UserWithNoPassword} from '@sharedTypes/DBTypes';
import {fetchData} from '../../lib/functions';
import {LoginResponse, UserResponse} from '@sharedTypes/MessageTypes';
import {MyContext} from '../../local-types';
export default {
  MediaItem: {
    owner: async (parent: {user_id: string}) => {
      const user = await fetchData<UserWithNoPassword>(
        process.env.AUTH_SERVER + '/users/' + parent.user_id,
      );
      return user;
    },
  },
  Query: {
    users: async () => {
      const users = await fetchData<UserWithNoPassword[]>(
        process.env.AUTH_SERVER + '/users',
      );
      return users;
    },
    user: async (_parent: undefined, args: {user_id: string}) => {
      const user = await fetchData<UserWithNoPassword>(
        process.env.AUTH_SERVER + '/users/' + args.user_id,
      );
      return user;
    },
    friends: async (_parent: undefined, args: {}, context: MyContext) => {
      const options: RequestInit = {
        headers: {
          Authorization: `Bearer ${context.user?.token}`,
        },
      };
      const friendsDataArray = await fetchData<UserWithNoPassword[]>(
        process.env.AUTH_SERVER + '/users/friends',
        options,
      );
      return friendsDataArray;
    },
    pendingFriends: async (
      _parent: undefined,
      args: {},
      context: MyContext,
    ) => {
      const options: RequestInit = {
        headers: {
          Authorization: `Bearer ${context.user?.token}`,
        },
      };
      const friendsDataArray = await fetchData<UserWithNoPassword[]>(
        process.env.AUTH_SERVER + '/users/pendingFriends',
        options,
      );
      return friendsDataArray;
    },
  },
  Mutation: {
    createUser: async (
      _parent: undefined,
      args: {input: Pick<User, 'username' | 'email' | 'password'>},
    ) => {
      const options: RequestInit = {
        method: 'POST',
        body: JSON.stringify(args.input),
        headers: {'Content-Type': 'application/json'},
      };
      const user = await fetchData<UserResponse>(
        process.env.AUTH_SERVER + '/users',
        options,
      );
      return user;
    },
    login: async (
      _parent: undefined,
      args: Pick<User, 'username' | 'password'>,
    ) => {
      const options = {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(args),
      };
      const loginResponse = await fetchData<LoginResponse>(
        process.env.AUTH_SERVER + '/auth/login',
        options,
      );
      return loginResponse;
    },
  },
};

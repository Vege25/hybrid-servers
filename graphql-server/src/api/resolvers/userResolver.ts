import {
  PendingFriend,
  User,
  UserWithNoPassword,
} from '../../hybrid-types/DBTypes';
import {fetchData} from '../../lib/functions';
import {LoginResponse, UserResponse} from '../../hybrid-types/MessageTypes';
import {MyContext} from '../../local-types';
import {GraphQLError} from 'graphql';
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
    userWithToken: async (_parent: undefined, args: {}, context: MyContext) => {
      const options: RequestInit = {
        headers: {
          Authorization: `Bearer ${context.user?.token}`,
        },
      };
      const user = await fetchData<Pick<LoginResponse, 'message' | 'user'>>(
        process.env.AUTH_SERVER + '/users/token',
        options,
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
      const friendsDataArray = await fetchData<PendingFriend[]>(
        process.env.AUTH_SERVER + '/users/pendingFriends',
        options,
      );
      console.log('friendsDataArray', friendsDataArray);
      return friendsDataArray;
    },
    getUsernameAviable: async (
      _parent: undefined,
      args: {username: string},
    ) => {
      const usernameIsAviable = await fetchData<Boolean>(
        process.env.AUTH_SERVER + `/users/username/${args.username}`,
      );
      return usernameIsAviable;
    },
    getEmailAviable: async (_parent: undefined, args: {email: string}) => {
      const emailIsAviable = await fetchData<Boolean>(
        process.env.AUTH_SERVER + `/users/email/${args.email}`,
      );
      return emailIsAviable;
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
    sendFriendRequest: async (
      _parent: undefined,
      args: {input: {friend_id: number}},
      context: MyContext,
    ) => {
      if (!context.user || !context.user.user_id) {
        throw new GraphQLError('Not authorized', {
          extensions: {code: 'NOT_AUTHORIZED'},
        });
      }

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${context.user?.token}`,
        },
        body: JSON.stringify(args),
      };
      const userResponse = await fetchData<UserResponse>(
        process.env.AUTH_SERVER + '/users/friends/' + args.input.friend_id,
        options,
      );
      return userResponse;
    },
    acceptFriendRequest: async (
      _parent: undefined,
      args: {input: {friend_id: number}},
      context: MyContext,
    ) => {
      if (!context.user || !context.user.user_id) {
        throw new GraphQLError('Not authorized', {
          extensions: {code: 'NOT_AUTHORIZED'},
        });
      }
      const options = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${context.user?.token}`,
        },
        body: JSON.stringify(args),
      };
      const userResponse = await fetchData<UserResponse>(
        process.env.AUTH_SERVER + '/users/acceptFriend/' + args.input.friend_id,
        options,
      );
      return userResponse;
    },
    deleteFriend: async (
      _parent: undefined,
      args: {input: {friend_id: number}},
      context: MyContext,
    ) => {
      if (!context.user || !context.user.user_id) {
        throw new GraphQLError('Not authorized', {
          extensions: {code: 'NOT_AUTHORIZED'},
        });
      }
      const options = {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${context.user?.token}`,
        },
        body: JSON.stringify(args),
      };
      const userResponse = await fetchData<UserResponse>(
        process.env.AUTH_SERVER + '/users/friends/' + args.input.friend_id,
        options,
      );
      return userResponse;
    },
  },
};

import {MediaItem} from '../../hybrid-types/DBTypes';
import {
  deleteLike,
  fetchAllMedia,
  fetchAllMyMediaByUserId,
  fetchAllTodaysMediaByUserId,
  fetchFriendsMediaByUserId,
  fetchMediaById,
  fetchMediaByTag,
  getCountByMediaId,
  getUserLike,
  postLike,
  postMedia,
  postTagToMedia,
  putMedia,
} from '../models/mediaModel';
import {MyContext} from '../../local-types';
import {GraphQLError} from 'graphql';

export default {
  Query: {
    mediaItems: async () => {
      return await fetchAllMedia();
    },
    mediaItem: async (_parent: undefined, args: {media_id: string}) => {
      console.log(args);
      const id = Number(args.media_id); // Typescript constructor changes string to number
      return await fetchMediaById(id);
    },
    mediaItemsByTag: async (_parent: undefined, args: {tag: string}) => {
      console.log(args);
      return await fetchMediaByTag(args.tag);
    },
    todaysMediaItems: async (
      _parent: undefined,
      args: {},
      context: MyContext,
    ) => {
      if (!context.user || !context.user.user_id) {
        throw new GraphQLError('Not authorized', {
          extensions: {code: 'NOT_AUTHORIZED'},
        });
      }
      const id = Number(context.user.user_id);
      return await fetchAllTodaysMediaByUserId(id);
    },
    myMedias: async (_parent: undefined, args: {}, context: MyContext) => {
      if (!context.user || !context.user.user_id) {
        throw new GraphQLError('Not authorized', {
          extensions: {code: 'NOT_AUTHORIZED'},
        });
      }
      const id = Number(context.user.user_id);
      return await fetchAllMyMediaByUserId(id);
    },
    oneFriendsMediaItems: async (
      _parent: undefined,
      args: {friend_id: string},
      context: MyContext,
    ) => {
      if (!context.user || !context.user.user_id) {
        throw new GraphQLError('Not authorized', {
          extensions: {code: 'NOT_AUTHORIZED'},
        });
      }
      const login_user_id = Number(context.user.user_id);
      const friend_id = Number(args.friend_id);
      return await fetchFriendsMediaByUserId(login_user_id, friend_id);
    },
    getUserLike: async (
      _parent: undefined,
      args: {media_id: string},
      context: MyContext,
    ) => {
      if (!context.user || !context.user.user_id) {
        throw new GraphQLError('Not authorized', {
          extensions: {code: 'NOT_AUTHORIZED'},
        });
      }
      return await getUserLike(Number(args.media_id), context.user.user_id);
    },
    getCountByMediaId: async (_parent: undefined, args: {media_id: string}) => {
      return await getCountByMediaId(Number(args.media_id));
    },
  },
  Mutation: {
    createMediaItem: async (
      _parent: undefined,
      args: {
        input: Omit<
          MediaItem,
          'media_id' | 'created_at' | 'thumbnail' | 'user_id'
        >;
      },
      context: MyContext,
    ) => {
      if (!context.user || !context.user.user_id) {
        throw new GraphQLError('Not authorized', {
          extensions: {code: 'NOT_AUTHORIZED'},
        });
      }
      const userData = {
        ...args.input,
        user_id: context.user.user_id,
      };

      return postMedia(userData);
    },
    addTagToMediaItem: async (
      _parent: undefined,
      args: {input: {tag_name: string; media_id: string}},
    ) => {
      return await postTagToMedia(
        args.input.tag_name,
        Number(args.input.media_id),
      );
    },
    updateMediaItem: async (
      _parent: undefined,
      args: {
        input: Pick<MediaItem, 'title' | 'description'>;
        media_id: string;
      },
    ) => {
      return await putMedia(args.input, Number(args.media_id));
    },
    postLike: async (
      _parent: undefined,
      args: {media_id: string},
      context: MyContext,
    ) => {
      if (!context.user || !context.user.user_id) {
        throw new GraphQLError('Not authorized', {
          extensions: {code: 'NOT_AUTHORIZED'},
        });
      }
      return await postLike(Number(args.media_id), context.user.user_id);
    },
    deleteLike: async (
      _parent: undefined,
      args: {media_id: string},
      context: MyContext,
    ) => {
      if (!context.user || !context.user.user_id) {
        throw new GraphQLError('Not authorized', {
          extensions: {code: 'NOT_AUTHORIZED'},
        });
      }
      try {
        const result = await deleteLike(
          Number(args.media_id),
          context.user.user_id,
        );

        // Check the result and handle accordingly
        if (result) {
          return {message: 'Like deleted successfully'};
        } else {
          return {message: 'Failed to delete like'};
        }
      } catch (error) {
        console.error('Error deleting like:', error);
        throw new GraphQLError('Failed to delete like');
      }
    },
  },
};

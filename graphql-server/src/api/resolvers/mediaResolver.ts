import {MediaItem} from '@sharedTypes/DBTypes';
import {
  fetchAllMedia,
  fetchAllMyMediaByUserId,
  fetchAllTodaysMediaByUserId,
  fetchFriendsMediaByUserId,
  fetchMediaById,
  fetchMediaByTag,
  postMedia,
  postTagToMedia,
  putMedia,
} from '../models/mediaModel';
import {FileInput, MyContext} from '../../local-types';
import {GraphQLError} from 'graphql';
import {fetchData} from '../../lib/functions';
import {UploadResponse} from '@sharedTypes/MessageTypes';

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
    addFile: async (
      _parent: undefined,
      args: {
        input: FileInput;
      },
      context: MyContext,
    ) => {
      const formData = new FormData();
      formData.append('file', args.input.file);

      const options: RequestInit = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${context.user?.token}`,
        },
        body: formData,
      };

      const uploadResponse = await fetchData<UploadResponse>(
        process.env.UPLOAD_SERVER + '/upload',
        options,
      );

      return uploadResponse;
    },
  },
};

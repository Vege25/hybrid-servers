import {MediaItem} from '@sharedTypes/DBTypes';
import {
  fetchAllMedia,
  fetchMediaById,
  fetchMediaByTag,
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
  },
};

import {ResultSetHeader, RowDataPacket} from 'mysql2';
import {MediaItem, TokenContent} from '../../hybrid-types/DBTypes';
import promisePool from '../../lib/db';
import {fetchData} from '../../lib/functions';
import {MediaResponse, MessageResponse} from '../../hybrid-types/MessageTypes';
import {Like} from '@sharedTypes/DBTypes';

/**
 * Get all media items from the database
 *
 * @returns {array} - array of media items
 * @throws {Error} - error if database query fails
 */

const fetchAllMedia = async (): Promise<MediaItem[] | null> => {
  const uploadPath = process.env.UPLOAD_URL;
  try {
    const [rows] = await promisePool.execute<RowDataPacket[] & MediaItem[]>(
      `SELECT *,
      CONCAT(?, filename) AS filename,
      CONCAT(?, CONCAT(filename, "-thumb.png")) AS thumbnail
      FROM MediaItems`,
      [uploadPath, uploadPath],
    );
    if (rows.length === 0) {
      return null;
    }
    return rows;
  } catch (e) {
    console.error('fetchAllMedia error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};

// Request a list of media items by tag
const fetchMediaByTag = async (tag: string): Promise<MediaItem[] | null> => {
  try {
    const [rows] = await promisePool.execute<RowDataPacket[] & MediaItem[]>(
      `SELECT MediaItems.*,
      CONCAT(?, MediaItems.filename) AS filename,
      CONCAT(?, CONCAT(MediaItems.filename, "-thumb.png")) AS thumbnail
      FROM MediaItems
      JOIN MediaItemTags ON MediaItems.media_id = MediaItemTags.media_id
      JOIN Tags ON MediaItemTags.tag_id = Tags.tag_id
      WHERE Tags.tag_name = ?`,
      [process.env.UPLOAD_URL, process.env.UPLOAD_URL, tag],
    );
    if (rows.length === 0) {
      return null;
    }
    return rows;
  } catch (e) {
    console.error('fetchMediaByTag error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};

/**
 * Get media item by id from the database
 *
 * @param {number} id - id of the media item
 * @returns {object} - object containing all information about the media item
 * @throws {Error} - error if database query fails
 */

const fetchMediaById = async (id: number): Promise<MediaItem | null> => {
  const uploadPath = process.env.UPLOAD_URL;
  try {
    // TODO: replace * with specific column names needed in this case
    const sql = `SELECT *,
                CONCAT(?, filename) AS filename,
                CONCAT(?, CONCAT(filename, "-thumb.png")) AS thumbnail
                FROM MediaItems
                WHERE media_id=?`;
    const params = [uploadPath, uploadPath, id];
    const [rows] = await promisePool.execute<RowDataPacket[] & MediaItem[]>(
      sql,
      params,
    );
    if (rows.length === 0) {
      return null;
    }
    return rows[0];
  } catch (e) {
    console.error('fetchMediaById error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};

/**
 * Add new media item to database
 *
 * @param {object} media - object containing all information about the new media item
 * @returns {object} - object containing id of the inserted media item in db
 * @throws {Error} - error if database query fails
 */
const postMedia = async (
  media: Omit<MediaItem, 'media_id' | 'created_at' | 'thumbnail'>,
): Promise<MediaItem | null> => {
  const {user_id, filename, filesize, media_type, title, description} = media;
  const sql = `INSERT INTO MediaItems (user_id, filename, filesize, media_type, title, description)
               VALUES (?, ?, ?, ?, ?, ?)`;
  const params = [user_id, filename, filesize, media_type, title, description];
  try {
    const result = await promisePool.execute<ResultSetHeader>(sql, params);
    console.log('result', result);
    const [rows] = await promisePool.execute<RowDataPacket[] & MediaItem[]>(
      'SELECT * FROM MediaItems WHERE media_id = ?',
      [result[0].insertId],
    );
    if (rows.length === 0) {
      return null;
    }
    return rows[0];
  } catch (e) {
    console.error('error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};

/**
 * Update media item in database
 *
 * @param {object} media - object containing all information about the media item
 * @param {number} id - id of the media item
 * @returns {object} - object containing id of the updated media item in db
 * @throws {Error} - error if database query fails
 */

const putMedia = async (
  media: Pick<MediaItem, 'title' | 'description'>,
  id: number,
): Promise<MediaResponse | null> => {
  try {
    const sql = promisePool.format(
      'UPDATE MediaItems SET ? WHERE media_id = ?',
      [media, id],
    );
    const result = await promisePool.execute<ResultSetHeader>(sql);
    console.log('result', result);
    if (result[0].affectedRows === 0) {
      return null;
    }

    const mediaItem = await fetchMediaById(id);
    if (!mediaItem) {
      return null;
    }
    return {message: 'Media updated', media: mediaItem};
  } catch (e) {
    console.error('error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};

/**
 * Delete media item from database
 *
 * @param {number} id - id of the media item
 * @returns {object} - object containing id of the deleted media item in db
 * @throws {Error} - error if database query fails
 */

const deleteMedia = async (
  id: number,
  user: TokenContent,
  token: string,
): Promise<MessageResponse> => {
  console.log('deleteMedia', id);
  const media = await fetchMediaById(id);
  console.log(media);

  if (!media) {
    return {message: 'Media not found'};
  }

  // if admin add user_id from media object to user object from token content
  if (user.level_name === 'Admin') {
    user.user_id = media.user_id;
  }

  // remove environment variable UPLOAD_URL from filename
  media.filename = media?.filename.replace(
    process.env.UPLOAD_URL as string,
    '',
  );

  console.log(token);

  const connection = await promisePool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute('DELETE FROM Likes WHERE media_id = ?;', [id]);

    await connection.execute('DELETE FROM Comments WHERE media_id = ?;', [id]);

    await connection.execute('DELETE FROM Ratings WHERE media_id = ?;', [id]);

    // ! user_id in SQL so that only the owner of the media item can delete it
    const [result] = await connection.execute<ResultSetHeader>(
      'DELETE FROM MediaItems WHERE media_id = ? and user_id = ?;',
      [id, user.user_id],
    );

    if (result.affectedRows === 0) {
      return {message: 'Media not deleted'};
    }

    // delete file from upload server
    const options = {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer ' + token,
      },
    };

    const deleteResult = await fetchData<MessageResponse>(
      `${process.env.UPLOAD_SERVER}/delete/${media.filename}`,
      options,
    );

    console.log('deleteResult', deleteResult);
    if (deleteResult.message !== 'File deleted') {
      throw new Error('File not deleted');
    }

    // if no errors commit transaction
    await connection.commit();

    return {message: 'Media deleted'};
  } catch (e) {
    await connection.rollback();
    console.error('error', (e as Error).message);
    throw new Error((e as Error).message);
  } finally {
    connection.release();
  }
};

/**
 * Get all the most liked media items from the database
 *
 * @returns {object} - object containing all information about the most liked media item
 * @throws {Error} - error if database query fails
 */

const fetchMostLikedMedia = async (): Promise<MediaItem | undefined> => {
  try {
    const [rows] = await promisePool.execute<RowDataPacket[] & MediaItem[]>(
      'SELECT * FROM `MostLikedMedia`',
    );
    if (rows.length === 0) {
      return undefined;
    }
    rows[0].filename =
      process.env.MEDIA_SERVER + '/uploads/' + rows[0].filename;
  } catch (e) {
    console.error('getMostLikedMedia error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};

/**
 * Get all the most commented media items from the database
 *
 * @returns {object} - object containing all information about the most commented media item
 * @throws {Error} - error if database query fails
 */

const fetchMostCommentedMedia = async (): Promise<MediaItem | undefined> => {
  try {
    const [rows] = await promisePool.execute<RowDataPacket[] & MediaItem[]>(
      'SELECT * FROM `MostCommentedMedia`',
    );
    if (rows.length === 0) {
      return undefined;
    }
    rows[0].filename =
      process.env.MEDIA_SERVER + '/uploads/' + rows[0].filename;
  } catch (e) {
    console.error('getMostCommentedMedia error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};

/**
 * Get all the highest rated media items from the database
 *
 * @returns {object} - object containing all information about the highest rated media item
 * @throws {Error} - error if database query fails
 */

const fetchHighestRatedMedia = async (): Promise<MediaItem | undefined> => {
  try {
    const [rows] = await promisePool.execute<RowDataPacket[] & MediaItem[]>(
      'SELECT * FROM `HighestRatedMedia`',
    );
    if (rows.length === 0) {
      return undefined;
    }
    rows[0].filename =
      process.env.MEDIA_SERVER + '/uploads/' + rows[0].filename;
    return rows[0];
  } catch (e) {
    console.error('getHighestRatedMedia error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};

// Attach a tag to a media item
const postTagToMedia = async (
  tag_name: string,
  media_id: number,
): Promise<MediaItem | null> => {
  try {
    let tag_id: number = 0;
    // check if tag exists (case insensitive)
    const [tagResult] = await promisePool.execute<RowDataPacket[]>(
      'SELECT * FROM Tags WHERE tag_name = ?',
      [tag_name],
    );
    if (tagResult.length === 0) {
      // if tag does not exist create it
      const [insertResult] = await promisePool.execute<ResultSetHeader>(
        'INSERT INTO Tags (tag_name) VALUES (?)',
        [tag_name],
      );
      // get tag_id from created tag
      if (insertResult.affectedRows === 0) {
        return null;
      }
      tag_id = insertResult.insertId;
    } else {
      // if tag exists get tag_id from the first result
      tag_id = tagResult[0].tag_id;
    }
    const [MediaItemTagsResult] = await promisePool.execute<ResultSetHeader>(
      'INSERT INTO MediaItemTags (tag_id, media_id) VALUES (?, ?)',
      [tag_id, media_id],
    );
    if (MediaItemTagsResult.affectedRows === 0) {
      return null;
    }

    return await fetchMediaById(media_id);
  } catch (e) {
    console.error('postTagToMedia error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};
const fetchAllMyMediaByUserId = async (
  id: number,
): Promise<MediaItem[] | null> => {
  try {
    const uploadPath = process.env.UPLOAD_URL;
    const [rows] = await promisePool.execute<RowDataPacket[] & MediaItem[]>(
      `SELECT *,
      CONCAT(?, filename) AS filename,
      CONCAT(?, CONCAT(filename, "-thumb.png")) AS thumbnail
      FROM MediaItems
      WHERE user_id = ?`,
      [uploadPath, uploadPath, id],
    );
    if (rows.length === 0) {
      return null;
    }
    return rows;
  } catch (e) {
    console.error('fetchAllMedia error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};
const fetchAllTodaysMediaByUserId = async (
  id: number,
): Promise<MediaItem[] | null> => {
  try {
    const [rows] = await promisePool.execute<RowDataPacket[] & MediaItem[]>(
      `SELECT mi.*
      FROM MediaItems mi
      JOIN Friends f ON (mi.user_id = f.user_id1 OR mi.user_id = f.user_id2)
      WHERE (f.user_id1 = ? OR f.user_id2 = ?)
        AND f.status = 'accepted'
        AND mi.user_id != ?
        AND DATE(mi.created_at) = CURDATE()
      ORDER BY mi.created_at DESC;
      `,
      [id, id, id],
    );
    console.log('rowit', rows);
    if (rows.length === 0) {
      return null;
    }
    return rows;
  } catch (e) {
    console.error('fetchAllTodaysMediaByUserId error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};
const fetchFriendsMediaByUserId = async (
  user_id: number,
  friend_id: number,
): Promise<MediaItem[] | null> => {
  try {
    const [rows] = await promisePool.execute<RowDataPacket[] & MediaItem[]>(
      `SELECT mi.*
      FROM MediaItems mi
      JOIN Friends f ON (mi.user_id = f.user_id1 OR mi.user_id = f.user_id2)
      WHERE (f.user_id1 = ? OR f.user_id2 = ?)
        AND f.status = 'accepted'
        AND mi.user_id = ?
        AND mi.user_id != ?
      ORDER BY mi.created_at DESC;
      `,
      [user_id, user_id, friend_id, user_id],
    );
    if (rows.length === 0) {
      return null;
    }
    return rows;
  } catch (e) {
    console.error('fetchFriendsMediaByUserId error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};
const postLike = async (media_id: number, user_id: number) => {
  try {
    console.log('postLike', media_id, user_id);
    // Check if a like already exists for the given media_id and user_id
    const [existingLike] = await promisePool.execute(
      'SELECT like_id FROM Likes WHERE media_id = ? AND user_id = ?;',
      [media_id, user_id],
    );

    if ((existingLike as any[]).length > 0) {
      return {message: 'Like already exists'};
    }

    const [result] = await promisePool.execute<ResultSetHeader>(
      'INSERT INTO Likes (media_id, user_id) VALUES (?, ?)',
      [media_id, user_id],
    );
    if (result.affectedRows === 0) {
      return null;
    }
    return {message: 'Like added'};
  } catch (e) {
    console.error('postLike error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};

const getUserLike = async (
  media_id: number,
  user_id: number,
): Promise<Like | null> => {
  try {
    const [rows] = await promisePool.execute<RowDataPacket[] & Like>(
      'SELECT * FROM Likes WHERE media_id = ? AND user_id = ?;',
      [media_id, user_id],
    );
    if (rows.length === 0) {
      return null;
    }
    const like: Like = rows[0] as Like;
    return like;
  } catch (e) {
    console.error('getUserLike error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};

const getCountByMediaId = async (
  media_id: number,
): Promise<{count: number}> => {
  try {
    const [rows] = await promisePool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM Likes WHERE media_id = ?;',
      [media_id],
    );
    if (rows.length === 0) {
      return {count: 0};
    }
    return rows[0] as {count: number};
  } catch (e) {
    console.error('getCountByMediaId error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};

const deleteLike = async (media_id: number, user_id: number) => {
  try {
    const [result] = await promisePool.execute<ResultSetHeader>(
      'DELETE FROM Likes WHERE media_id = ? AND user_id = ?;',
      [media_id, user_id],
    );
    if (result.affectedRows === 0) {
      return null;
    }
    return {message: 'Like deleted'};
  } catch (e) {
    console.error('deleteLike error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};

export {
  fetchAllMedia,
  fetchMediaByTag,
  fetchMediaById,
  postMedia,
  deleteMedia,
  fetchMostLikedMedia,
  fetchMostCommentedMedia,
  fetchHighestRatedMedia,
  putMedia,
  postTagToMedia,
  fetchAllTodaysMediaByUserId,
  fetchFriendsMediaByUserId,
  fetchAllMyMediaByUserId,
  postLike,
  getUserLike,
  getCountByMediaId,
  deleteLike,
};

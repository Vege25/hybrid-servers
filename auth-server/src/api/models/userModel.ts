import {ResultSetHeader, RowDataPacket} from 'mysql2';
import {promisePool} from '../../lib/db';
import {UserWithLevel, User, UserWithNoPassword} from '@sharedTypes/DBTypes';
import {UserDeleteResponse} from '@sharedTypes/MessageTypes';

const getUserById = async (id: number): Promise<UserWithNoPassword | null> => {
  try {
    const [rows] = await promisePool.execute<
      RowDataPacket[] & UserWithNoPassword[]
    >(
      `
    SELECT
      Users.user_id,
      Users.username,
      Users.email,
      Users.created_at,
      UserLevels.level_name
    FROM Users
    JOIN UserLevels
    ON Users.user_level_id = UserLevels.level_id
    WHERE Users.user_id = ?
  `,
      [id]
    );
    if (rows.length === 0) {
      return null;
    }
    return rows[0];
  } catch (e) {
    console.error('getUserById error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};

const getAllUsers = async (): Promise<UserWithNoPassword[] | null> => {
  try {
    const [rows] = await promisePool.execute<
      RowDataPacket[] & UserWithNoPassword[]
    >(
      `
    SELECT
      Users.user_id,
      Users.username,
      Users.email,
      Users.created_at,
      UserLevels.level_name
    FROM Users
    JOIN UserLevels
    ON Users.user_level_id = UserLevels.level_id
  `
    );

    if (rows.length === 0) {
      return null;
    }

    return rows;
  } catch (e) {
    console.error('getAllUsers error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};

const getUserByEmail = async (email: string): Promise<UserWithLevel | null> => {
  try {
    const [rows] = await promisePool.execute<RowDataPacket[] & UserWithLevel[]>(
      `
    SELECT
      Users.user_id,
      Users.username,
      Users.password,
      Users.email,
      Users.created_at,
      UserLevels.level_name
    FROM Users
    JOIN UserLevels
    ON Users.user_level_id = UserLevels.level_id
    WHERE Users.email = ?
  `,
      [email]
    );
    if (rows.length === 0) {
      return null;
    }
    return rows[0];
  } catch (e) {
    console.error('getUserByEmail error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};

const getUserByUsername = async (
  username: string
): Promise<UserWithLevel | null> => {
  try {
    const [rows] = await promisePool.execute<RowDataPacket[] & UserWithLevel[]>(
      `
    SELECT
      Users.user_id,
      Users.username,
      Users.password,
      Users.email,
      Users.created_at,
      UserLevels.level_name
    FROM Users
    JOIN UserLevels
    ON Users.user_level_id = UserLevels.level_id
    WHERE Users.username = ?
  `,
      [username]
    );
    if (rows.length === 0) {
      return null;
    }
    return rows[0];
  } catch (e) {
    console.error('getUserByUsername error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};

const createUser = async (user: User): Promise<UserWithNoPassword | null> => {
  try {
    const result = await promisePool.execute<ResultSetHeader>(
      `
    INSERT INTO Users (username, password, email, user_level_id)
    VALUES (?, ?, ?, ?)
  `,
      [user.username, user.password, user.email, 2]
    );

    if (result[0].affectedRows === 0) {
      return null;
    }

    const newUser = await getUserById(result[0].insertId);
    return newUser;
  } catch (e) {
    console.error('createUser error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};

const modifyUser = async (
  user: User,
  id: number
): Promise<UserWithNoPassword | null> => {
  try {
    const sql = promisePool.format(
      `
      UPDATE Users
      SET ?
      WHERE user_id = ?
      `,
      [user, id]
    );

    const result = await promisePool.execute<ResultSetHeader>(sql);

    if (result[0].affectedRows === 0) {
      return null;
    }

    const newUser = await getUserById(id);
    return newUser;
  } catch (e) {
    console.error('modifyUser error', (e as Error).message);
    throw new Error((e as Error).message);
  }
};

const deleteUser = async (id: number): Promise<UserDeleteResponse | null> => {
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('DELETE FROM Comments WHERE user_id = ?;', [id]);
    await connection.execute('DELETE FROM Likes WHERE user_id = ?;', [id]);
    await connection.execute('DELETE FROM Ratings WHERE user_id = ?;', [id]);
    await connection.execute(
      'DELETE FROM Comments WHERE media_id IN (SELECT media_id FROM MediaItems WHERE user_id = ?);',
      [id]
    );
    await connection.execute(
      'DELETE FROM Likes WHERE media_id IN (SELECT media_id FROM MediaItems WHERE user_id = ?);',
      [id]
    );
    await connection.execute(
      'DELETE FROM Ratings WHERE media_id IN (SELECT media_id FROM MediaItems WHERE user_id = ?);',
      [id]
    );
    await connection.execute(
      'DELETE FROM MediaItemTags WHERE media_id IN (SELECT media_id FROM MediaItems WHERE user_id = ?);',
      [id]
    );
    await connection.execute('DELETE FROM MediaItems WHERE user_id = ?;', [id]);
    const [result] = await connection.execute<ResultSetHeader>(
      'DELETE FROM Users WHERE user_id = ?;',
      [id]
    );

    await connection.commit();

    if (result.affectedRows === 0) {
      return null;
    }

    console.log('result', result);
    return {message: 'User deleted', user: {user_id: id}};
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
};

const getFriendsById = async (
  id: number
): Promise<UserWithNoPassword[] | null> => {
  try {
    const [rows] = await promisePool.execute<
      RowDataPacket[] & UserWithNoPassword[]
    >(
      `
      SELECT
        u.user_id,
        u.username,
        u.email
      FROM
        Users u
      JOIN
        Friends f ON (u.user_id = f.user_id1 OR u.user_id = f.user_id2)
      WHERE
        (f.user_id1 = ? OR f.user_id2 = ?)
        AND f.status = 'accepted'
        AND u.user_id != ?
      ORDER BY
        f.created_at DESC;
      `,
      [id, id, id]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows;
  } catch (e) {
    console.error('getFriendsById error', e);
    throw new Error((e as Error).message);
  }
};
const getPendingFriendsById = async (
  id: number
): Promise<UserWithNoPassword[] | null> => {
  try {
    const [rows] = await promisePool.execute<
      RowDataPacket[] & UserWithNoPassword[]
    >(
      `
      SELECT u.user_id, u.username, u.email FROM Users u
JOIN Friends f ON (u.user_id = f.user_id1 OR u.user_id = f.user_id2)
WHERE f.user_id2 = ?
AND f.status = 'pending'
AND u.user_id != ?
ORDER BY f.created_at DESC;

      `,
      [id, id]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows;
  } catch (e) {
    console.error('getFriendsById error', e);
    throw new Error((e as Error).message);
  }
};

export {
  getUserById,
  getAllUsers,
  getUserByEmail,
  getUserByUsername,
  createUser,
  modifyUser,
  deleteUser,
  getFriendsById,
  getPendingFriendsById,
};

import express from 'express';
import {
  friendsMediaListGetByUserId,
  mediaDelete,
  mediaGet,
  mediaListGet,
  mediaListGetByAppId,
  mediaPost,
  myMediaListGetByUserId,
  todaysMediaListGetByUserId,
} from '../controllers/mediaController';
import {authenticate} from '../../middlewares';

const router = express.Router();

router.route('/').get(mediaListGet).post(authenticate, mediaPost);

router.route('/:id').get(mediaGet).delete(authenticate, mediaDelete);

router.route('/app/:id').get(mediaListGetByAppId);

router.route('/myMedia/:id').get(myMediaListGetByUserId);

router.route('/todaysMedia/:id').get(todaysMediaListGetByUserId);

router
  .route('/friendMedia/:user_id/:friend_id')
  .get(friendsMediaListGetByUserId);

export default router;

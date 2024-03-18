import express, {Request} from 'express';
import {deleteFile, uploadFile} from '../controllers/uploadController';
import multer, {FileFilterCallback} from 'multer';
import {authenticate, makeThumbnail} from '../../middlewares';

/**
 * Middleware function to filter files based on their MIME type.
 * @param request The HTTP request object.
 * @param file The uploaded file object.
 * @param cb The callback function to invoke after filtering.
 */
const fileFilter = (
  request: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (file.mimetype.includes('image') || file.mimetype.includes('video')) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({dest: './uploads/', fileFilter});
const router = express.Router();

// TODO: validation

/**
 * POST endpoint to upload a file.
 * @route POST /upload
 * @group File Management - Operations for managing files
 * @param {string} file.formData.required - The file to upload.
 * @returns {object} 200 - The uploaded file information.
 * @returns {Error}  401 - Unauthorized.
 * @returns {Error}  500 - Internal server error.
 */
router
  .route('/upload')
  .post(authenticate, upload.single('file'), makeThumbnail, uploadFile);

/**
 * DELETE endpoint to delete a file.
 * @route DELETE /delete/{filename}
 * @group File Management - Operations for managing files
 * @param {string} filename.path.required - The filename to delete.
 * @returns {object} 200 - The file deletion status.
 * @returns {Error}  401 - Unauthorized.
 * @returns {Error}  500 - Internal server error.
 */
router.route('/delete/:filename').delete(authenticate, deleteFile);

export default router;

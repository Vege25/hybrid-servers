import express, {Request} from 'express';
import {deleteFile, uploadFile} from '../controllers/uploadController';
import multer, {FileFilterCallback} from 'multer';
import {authenticate, makeThumbnail} from '../../middlewares';

// Define a file filter function for multer
const fileFilter = (
  request: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  // Check if the file MIME type includes 'image' or 'video'
  if (file.mimetype.includes('image') || file.mimetype.includes('video')) {
    // Allow file upload
    cb(null, true);
  } else {
    // Reject file upload
    cb(null, false);
  }
};

// Configure multer for file upload
const upload = multer({dest: './uploads/', fileFilter});

// Create a router instance
const router = express.Router();

// Route for uploading files
router
  .route('/upload')
  /**
   * @api {post} /upload Upload a file
   * @apiName UploadFile
   * @apiGroup Upload
   * @apiPermission authenticated
   *
   *
   * @apiSuccess {String} message Success message
   * @apiSuccess {Object} data Uploaded file data
   */
  .post(authenticate, upload.single('file'), makeThumbnail, uploadFile);

// Route for deleting files
router
  .route('/delete/:filename')
  /**
   * @api {delete} /delete/:filename Delete a file
   * @apiName DeleteFile
   * @apiGroup Upload
   * @apiPermission authenticated
   *
   * @apiParam {String} filename Filename to delete
   *
   * @apiSuccess {String} message Success message
   */
  .delete(authenticate, deleteFile);

// Export the router
export default router;

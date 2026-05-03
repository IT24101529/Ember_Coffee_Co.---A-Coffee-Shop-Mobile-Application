import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import {
  getReviewsByProduct,
  getAllReviews,
  createReview,
  updateReview,
  deleteReview,
  uploadReviewImage,
} from '../controllers/reviewController.js';

const router = Router();

router.get('/',                   protect, getAllReviews);
router.get('/product/:productId', getReviewsByProduct);
router.post('/',          protect, createReview);
router.put('/:id',        protect, updateReview);
router.delete('/:id',     protect, deleteReview);
router.post('/:id/upload',protect, upload.single('image'), uploadReviewImage);

export default router;

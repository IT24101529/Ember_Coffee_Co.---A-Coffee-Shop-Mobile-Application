import { Router } from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import {
  getRewards,
  getMyRedemptions,
  createReward,
  updateReward,
  deleteReward,
  redeemReward,
  uploadRewardImage,
} from '../controllers/rewardController.js';

const router = Router();

router.get('/',            protect, getRewards);
router.get('/history',     protect, getMyRedemptions);
router.post('/',           protect, adminOnly, createReward);
router.put('/:id',         protect, adminOnly, updateReward);
router.delete('/:id',      protect, adminOnly, deleteReward);
router.post('/:id/redeem', protect, redeemReward);
router.post('/:id/upload', protect, adminOnly, upload.single('image'), uploadRewardImage);

export default router;

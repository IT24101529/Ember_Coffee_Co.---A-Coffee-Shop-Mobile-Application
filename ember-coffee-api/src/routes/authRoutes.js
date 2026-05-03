import { Router } from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import {
  register,
  login,
  getProfile,
  updateProfile,
  uploadProfileImage,
  deleteAccount,
  getAllUsers,
  updateUserByAdmin,
  deleteUserByAdmin,
} from '../controllers/authController.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.delete('/profile', protect, deleteAccount);
router.post('/profile/upload', protect, upload.single('image'), uploadProfileImage);

// Admin user management
router.get('/users', protect, adminOnly, getAllUsers);
router.put('/users/:id', protect, adminOnly, updateUserByAdmin);
router.delete('/users/:id', protect, adminOnly, deleteUserByAdmin);

export default router;

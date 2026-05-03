import { Router } from 'express';
import { protect, adminOnly, managerOrAdmin } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
} from '../controllers/productController.js';

const router = Router();

router.get('/',            getProducts);
router.get('/:id',         getProductById);
router.post('/',           protect, managerOrAdmin, createProduct);
router.put('/:id',         protect, managerOrAdmin, updateProduct);
router.delete('/:id',      protect, adminOnly,      deleteProduct);
router.post('/:id/upload', protect, managerOrAdmin, upload.single('image'), uploadProductImage);

export default router;

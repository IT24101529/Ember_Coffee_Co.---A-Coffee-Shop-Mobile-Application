import Product from '../models/Product.js';

export const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    next(err);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      return next(err);
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const { productName, category, price } = req.body;
    if (!productName || !category || price === undefined) {
      return res.status(400).json({ message: 'productName, category, and price are required' });
    }
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    next(err);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    // Validate that the id is a valid MongoDB ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    console.log('[updateProduct] id:', id, '| body:', JSON.stringify(req.body));

    // Build the update object from provided fields
    const updateFields = {};
    if (req.body.productName !== undefined) updateFields.productName = req.body.productName;
    if (req.body.category !== undefined) updateFields.category = req.body.category;
    if (req.body.price !== undefined) updateFields.price = req.body.price;
    if (req.body.description !== undefined) updateFields.description = req.body.description;
    if (req.body.isAvailable !== undefined) updateFields.isAvailable = Boolean(req.body.isAvailable);
    if (req.body.productImageUrl !== undefined) updateFields.productImageUrl = req.body.productImageUrl;

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      err.status = 400;
      err.message = err.name === 'CastError'
        ? 'Invalid product ID format'
        : err.message;
    }
    next(err);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      return next(err);
    }
    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
};

export const uploadProductImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      return next(err);
    }
    
    product.productImageUrl = req.file.path;
    await product.save();
    res.json(product);
  } catch (err) {
    next(err);
  }
};

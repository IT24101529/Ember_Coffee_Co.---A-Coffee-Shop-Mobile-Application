import Review from '../models/Review.js';

export const getReviewsByProduct = async (req, res, next) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId })
      .populate('userId', 'name profileImageUrl');
    res.json(reviews);
  } catch (err) {
    next(err);
  }
};

export const getAllReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find()
      .populate('userId', 'name profileImageUrl')
      .populate('productId', 'productName')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    next(err);
  }
};

export const createReview = async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body;
    if (!productId) {
      return res.status(400).json({ message: 'productId is required' });
    }
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
    }
    const review = await Review.create({
      userId: req.user.id,
      productId,
      rating: r,
      comment: typeof comment === 'string' ? comment : '',
    });
    await review.populate('userId', 'name profileImageUrl');
    res.status(201).json(review);
  } catch (err) {
    if (err.name === 'ValidationError') err.status = 400;
    next(err);
  }
};

export const updateReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      const err = new Error('Review not found');
      err.status = 404;
      return next(err);
    }
    if (!review.userId.equals(req.user.id)) {
      return res.status(403).json({ message: 'Not authorised to edit this review' });
    }
    const { rating, comment } = req.body;
    if (rating !== undefined) {
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
      }
      review.rating = rating;
    }
    if (comment !== undefined) review.comment = comment;
    await review.save();
    await review.populate('userId', 'name profileImageUrl');
    res.json(review);
  } catch (err) {
    next(err);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      const err = new Error('Review not found');
      err.status = 404;
      return next(err);
    }
    if (!review.userId.equals(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorised to delete this review' });
    }
    await review.deleteOne();
    res.json({ message: 'Review deleted' });
  } catch (err) {
    next(err);
  }
};

export const uploadReviewImage = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      const err = new Error('Review not found');
      err.status = 404;
      return next(err);
    }
    if (!review.userId.equals(req.user.id)) {
      return res.status(403).json({ message: 'Not authorised to update this review' });
    }
    review.reviewImageUrl = req.file.path;
    await review.save();
    await review.populate('userId', 'name profileImageUrl');
    res.json(review);
  } catch (err) {
    next(err);
  }
};

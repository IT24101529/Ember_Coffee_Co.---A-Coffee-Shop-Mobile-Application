import StoreReview from '../models/StoreReview.js';

export const getStoreReviews = async (req, res, next) => {
  try {
    const reviews = await StoreReview.find()
      .populate('userId', 'name profileImageUrl')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    next(err);
  }
};

export const createStoreReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    const review = await StoreReview.create({ userId: req.user.id, rating, comment });
    const populated = await review.populate('userId', 'name profileImageUrl');
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

export const updateStoreReview = async (req, res, next) => {
  try {
    const review = await StoreReview.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (!review.userId.equals(req.user.id)) {
      return res.status(403).json({ message: 'Not authorised to edit this review' });
    }
    const { rating, comment } = req.body;
    if (rating !== undefined) {
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
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

export const uploadStoreReviewImage = async (req, res, next) => {
  try {
    const review = await StoreReview.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (!review.userId.equals(req.user.id))
      return res.status(403).json({ message: 'Not authorised' });
    review.reviewImageUrl = req.file.path;
    await review.save();
    res.json(review);
  } catch (err) {
    next(err);
  }
};

export const deleteStoreReview = async (req, res, next) => {
  try {
    const review = await StoreReview.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (!review.userId.equals(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorised' });
    }
    await review.deleteOne();
    res.json({ message: 'Review deleted' });
  } catch (err) {
    next(err);
  }
};

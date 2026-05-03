import Reward from '../models/Reward.js';
import User from '../models/User.js';
import Redemption from '../models/Redemption.js';

export const getRewards = async (req, res, next) => {
  try {
    const rewards = await Reward.find({ isAvailable: true });
    res.json(rewards);
  } catch (err) {
    next(err);
  }
};

export const getMyRedemptions = async (req, res, next) => {
  try {
    const redemptions = await Redemption.find({ userId: req.user.id })
      .populate('rewardId')
      .sort({ redeemedAt: -1 });
    res.json(redemptions);
  } catch (err) {
    next(err);
  }
};

export const createReward = async (req, res, next) => {
  try {
    const { rewardName, pointsRequired } = req.body;
    if (!rewardName || pointsRequired === undefined) {
      return res.status(400).json({ message: 'rewardName and pointsRequired are required' });
    }
    const reward = await Reward.create(req.body);
    res.status(201).json(reward);
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    next(err);
  }
};

export const updateReward = async (req, res, next) => {
  try {
    const reward = await Reward.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!reward) {
      const err = new Error('Reward not found');
      err.status = 404;
      return next(err);
    }
    res.json(reward);
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    next(err);
  }
};

export const deleteReward = async (req, res, next) => {
  try {
    const reward = await Reward.findByIdAndDelete(req.params.id);
    if (!reward) {
      const err = new Error('Reward not found');
      err.status = 404;
      return next(err);
    }
    res.json({ message: 'Reward deleted' });
  } catch (err) {
    next(err);
  }
};

export const redeemReward = async (req, res, next) => {
  try {
    const reward = await Reward.findById(req.params.id);
    if (!reward) {
      const err = new Error('Reward not found');
      err.status = 404;
      return next(err);
    }

    if (!reward.isAvailable) {
      const err = new Error('Reward is not available');
      err.status = 400;
      return next(err);
    }

    const userId = req.user.id;

    // Check for recent redemption (2 months / 60 days)
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    
    const recentRedemption = await Redemption.findOne({
      userId,
      rewardId: reward._id,
      redeemedAt: { $gt: twoMonthsAgo }
    });
    
    if (recentRedemption) {
      const err = new Error('You have already redeemed this reward within the last 60 days');
      err.status = 400;
      return next(err);
    }

    const user = await User.findById(userId);

    if (user.totalPoints < reward.pointsRequired) {
      const err = new Error('Insufficient points');
      err.status = 400;
      return next(err);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { totalPoints: -reward.pointsRequired } },
      { new: true }
    );

    try {
      await Redemption.create({
        userId,
        rewardId: reward._id,
        pointsUsed: reward.pointsRequired,
      });
    } catch (redemptionErr) {
      console.error('Redemption creation failed, compensating points:', redemptionErr);
      await User.findByIdAndUpdate(userId, { $inc: { totalPoints: +reward.pointsRequired } });
      return next(redemptionErr);
    }

    res.json({ message: 'Reward redeemed', totalPoints: updatedUser.totalPoints });
  } catch (err) {
    next(err);
  }
};

export const uploadRewardImage = async (req, res, next) => {
  try {
    const reward = await Reward.findById(req.params.id);
    if (!reward) {
      const err = new Error('Reward not found');
      err.status = 404;
      return next(err);
    }
    reward.rewardImageUrl = req.file.path;
    await reward.save();
    res.json(reward);
  } catch (err) {
    next(err);
  }
};

import Order from '../models/Order.js';
import User from '../models/User.js';
import { capTotalPoints } from '../utils/loyaltyPoints.js';

/** Ready / Delivered orders disappear from the customer's active list after this long */
const ACTIVE_TERMINAL_MS = 12 * 60 * 60 * 1000;

function isTerminalCustomerStatus(status) {
  return status === 'Ready' || status === 'Delivered' || status === 'Cancelled';
}

function terminalCompletedAt(order) {
  if (order.completedAt) return new Date(order.completedAt).getTime();
  if (isTerminalCustomerStatus(order.orderStatus)) {
    return new Date(order.updatedAt || order.createdAt).getTime();
  }
  return null;
}

function isActiveOnCustomerList(order) {
  if (!isTerminalCustomerStatus(order.orderStatus)) return true;
  const t = terminalCompletedAt(order);
  if (t == null) return true;
  return Date.now() - t <= ACTIVE_TERMINAL_MS;
}

function statusSequenceForOrder(order) {
  const method = order.fulfillmentMethod === 'Delivery' ? 'Delivery' : 'Pickup';
  if (method === 'Delivery') {
    return ['Pending', 'Brewing', 'Delivering', 'Delivered'];
  }
  return ['Pending', 'Brewing', 'Ready'];
}

function normalizeFulfillmentMethod(body) {
  const raw = body?.fulfillmentMethod ?? body?.fulfillment ?? 'Pickup';
  if (raw === 'Delivery' || raw === 'delivery') return 'Delivery';
  return 'Pickup';
}

export const createOrder = async (req, res, next) => {
  try {
    const { items, totalAmount, promoCode, paymentMethod, deliveryAddress } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'items array must not be empty' });
    }
    const fulfillmentMethod = normalizeFulfillmentMethod(req.body);
    const order = await Order.create({
      userId: req.user.id,
      items,
      totalAmount,
      orderStatus: 'Pending',
      fulfillmentMethod,
      paymentMethod,
      deliveryAddress: deliveryAddress || '',
      promoCode: promoCode || '',
    });
    const populated = await Order.findById(order._id).populate(
      'items.productId',
      'productName productImageUrl',
    );
    res.status(201).json(populated);
  } catch (err) {
    if (err.name === 'ValidationError') err.status = 400;
    next(err);
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .populate('items.productId', 'productName productImageUrl')
      .sort({ createdAt: -1 });
    res.json(orders.filter(isActiveOnCustomerList));
  } catch (err) {
    next(err);
  }
};

export const getMyOrderHistory = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .populate('items.productId', 'productName productImageUrl')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

export const getMyOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).populate('items.productId', 'productName productImageUrl');
    if (!order) {
      const err = new Error('Order not found');
      err.status = 404;
      return next(err);
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!order) {
      const err = new Error('Order not found');
      err.status = 404;
      return next(err);
    }
    if (order.orderStatus !== 'Pending') {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
    }
    
    order.orderStatus = 'Cancelled';
    order.completedAt = new Date();
    await order.save();

    const populated = await Order.findById(order._id)
      .populate('items.productId', 'productName productImageUrl');
    res.json(populated);
  } catch (err) {
    next(err);
  }
};

export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'name email profileImageUrl')
      .populate('items.productId', 'productName productImageUrl')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      const err = new Error('Order not found');
      err.status = 404;
      return next(err);
    }

    if (req.body.orderStatus === 'Cancelled') {
      order.orderStatus = 'Cancelled';
      order.completedAt = new Date();
      await order.save();
      const populated = await Order.findById(order._id)
        .populate('userId', 'name email profileImageUrl')
        .populate('items.productId', 'productName productImageUrl');
      return res.json(populated);
    }

    const sequence = statusSequenceForOrder(order);
    const currentIndex = sequence.indexOf(order.orderStatus);
    const nextStatus = sequence[currentIndex + 1];

    if (!nextStatus || req.body.orderStatus !== nextStatus) {
      return res.status(400).json({
        message: `Invalid status transition. Current status is '${order.orderStatus}'. Next valid status is '${nextStatus || 'none (already at final status)'}'.`,
      });
    }

    order.orderStatus = nextStatus;
    if (nextStatus === 'Ready' || nextStatus === 'Delivered') {
      order.completedAt = new Date();
    }
    await order.save();

    const awardPoints =
      (order.fulfillmentMethod === 'Delivery' && nextStatus === 'Delivered') ||
      (order.fulfillmentMethod !== 'Delivery' && nextStatus === 'Ready');

    if (awardPoints) {
      const pointsEarned = Math.floor(order.totalAmount * 0.01);
      if (pointsEarned > 0) {
        const customer = await User.findById(order.userId);
        if (customer) {
          const newTotal = capTotalPoints(customer.totalPoints + pointsEarned);
          await User.findByIdAndUpdate(order.userId, { totalPoints: newTotal });
        }
      }
    }

    const populated = await Order.findById(order._id)
      .populate('userId', 'name email profileImageUrl')
      .populate('items.productId', 'productName productImageUrl');
    res.json(populated);
  } catch (err) {
    next(err);
  }
};

export const uploadPaymentScreenshot = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentScreenshotUrl: req.file.path },
      { new: true }
    );
    if (!order) {
      const err = new Error('Order not found');
      err.status = 404;
      return next(err);
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
};

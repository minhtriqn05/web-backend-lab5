// controllers/order.controller.js - Lab 5 homework (Requirements 1, 3, 4)
const mongoose = require('mongoose');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const httpError = require('../utils/httpError');
const { sendOrderConfirmation, sendOrderStatusUpdate } = require('../services/emailService');

const STATUSES = ['pending', 'completed', 'cancelled'];

// Turn the request body into [{ productId, quantity }] with one line per product (or throw a 400)
function readItems(body) {
  const { items } = body || {};
  if (!Array.isArray(items) || items.length === 0) throw httpError(400, 'items must be a non-empty array');

  const merged = new Map(); // productId -> quantity (the same product twice is added up)
  for (const item of items) {
    const productId = String(item?.productId ?? '');
    const quantity = Number(item?.quantity);
    if (!mongoose.isValidObjectId(productId)) throw httpError(400, `Invalid productId "${productId}"`);
    if (!Number.isInteger(quantity) || quantity < 1) throw httpError(400, 'Each quantity must be a whole number >= 1');
    merged.set(productId, (merged.get(productId) || 0) + quantity);
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

// POST /api/v1/orders (any logged-in user)
exports.createOrder = async (req, res, next) => {
  try {
    const lines = readItems(req.body);

    // Prices come from the database, never from the client
    const products = await Product.find({ _id: { $in: lines.map((l) => l.productId) } });
    const byId = new Map(products.map((p) => [p._id.toString(), p]));

    const items = lines.map(({ productId, quantity }) => {
      const product = byId.get(productId);
      if (!product) throw httpError(400, `Product ${productId} does not exist`);
      if (product.status === 'archived') throw httpError(400, `"${product.name}" is no longer available`);
      return { productId: product._id, name: product.name, price: product.price, quantity };
    });
    const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const order = await Order.create({ userId: req.user.id, items, totalAmount });

    // Requirement 4: confirmation email. Not awaited -> a slow / failing email never breaks the order
    const user = await User.findById(req.user.id);
    if (user) {
      sendOrderConfirmation(user, order).catch((err) => console.error('[EMAIL] Confirmation failed:', err.message));
    }

    res.status(201).json({ success: true, message: 'Order placed', data: order });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/orders/mine (any logged-in user) - only the user's own orders
exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/orders (admin) - every order, with the customer's name and email
exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('userId', 'fullName email');
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/orders/:id/status (admin) body: { status }
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!STATUSES.includes(status)) throw httpError(400, `status must be one of: ${STATUSES.join(', ')}`);

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { returnDocument: 'after', runValidators: true }
    ).populate('userId', 'fullName email');
    if (!order) throw httpError(404, `Order ${req.params.id} not found`);

    const customer = order.userId; // populated { _id, fullName, email }
    const customerId = customer?._id ?? customer;

    // Requirement 3: real-time update, only to the customer who owns the order
    req.app.get('io').to(`user:${customerId}`).emit('orderStatusUpdated', {
      orderId: order._id,
      status: order.status,
      order
    });

    // Requirement 4: status-update email
    if (customer?.email) {
      sendOrderStatusUpdate(customer, order).catch((err) => console.error('[EMAIL] Status email failed:', err.message));
    }

    res.json({ success: true, message: `Order set to ${status}`, data: order });
  } catch (error) {
    next(error);
  }
};

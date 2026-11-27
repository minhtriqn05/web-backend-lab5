// controllers/product.controller.js
const mongoose = require('mongoose');
const Product = require('../models/product.model');
const Category = require('../models/category.model');
const httpError = require('../utils/httpError');
const { PRODUCTS_ROOM } = require('../socket');

// 400 if categoryId is missing/invalid or the category does not exist
async function assertCategoryExists(categoryId) {
  if (categoryId === undefined) return; // not being changed
  if (!mongoose.isValidObjectId(categoryId)) throw httpError(400, 'A valid categoryId is required');
  if (!(await Category.exists({ _id: categoryId }))) throw httpError(400, `Category ${categoryId} does not exist`);
}

// GET /api/v1/products?categoryId= (any logged-in user)
exports.getProducts = async (req, res, next) => {
  try {
    const filter = {};
    const { categoryId } = req.query;
    if (categoryId) {
      if (!mongoose.isValidObjectId(categoryId)) throw httpError(400, 'categoryId must be a valid id');
      filter.categoryId = categoryId;
    }
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: products.length, data: products });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/products/:id (any logged-in user)
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw httpError(404, `Product ${req.params.id} not found`);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/products (admin)
exports.createProduct = async (req, res, next) => {
  try {
    const { name, categoryId, quantity, price } = req.body || {};
    if (categoryId === undefined) throw httpError(400, 'categoryId is required');
    await assertCategoryExists(categoryId);
    const product = await Product.create({ name, categoryId, quantity, price });
    res.status(201).json({ success: true, message: 'Product created', data: product });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/products/:id (admin) - Lab 5 Ex2: broadcast the change in real time
exports.updateProduct = async (req, res, next) => {
  try {
    const updates = {};
    ['categoryId', 'name', 'quantity', 'price'].forEach((field) => {
      if (req.body?.[field] !== undefined) updates[field] = req.body[field];
    });
    await assertCategoryExists(updates.categoryId);
    // Back in stock -> an archived product becomes active again
    if (updates.quantity !== undefined && Number(updates.quantity) > 0) updates.status = 'active';

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      returnDocument: 'after',
      runValidators: true
    });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Push the new data to everyone currently on the Products page
    const io = req.app.get('io');
    io.to(PRODUCTS_ROOM).emit('productUpdated', {
      product,
      updatedBy: req.user.id
    });

    res.json({ success: true, message: 'Product updated', data: product });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/products/:id (admin)
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) throw httpError(404, `Product ${req.params.id} not found`);
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
};

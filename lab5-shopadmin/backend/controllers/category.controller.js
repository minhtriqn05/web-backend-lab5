// controllers/category.controller.js
const Category = require('../models/category.model');
const Product = require('../models/product.model');
const httpError = require('../utils/httpError');

function readName(body) {
  const { name } = body || {};
  if (typeof name !== 'string' || !name.trim()) throw httpError(400, 'Category name is required');
  if (name.trim().length > 100) throw httpError(400, 'Category name must be at most 100 characters');
  return name.trim();
}

// GET /api/v1/categories (any logged-in user)
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/categories (admin)
exports.createCategory = async (req, res, next) => {
  try {
    const category = await Category.create({ name: readName(req.body) });
    res.status(201).json({ success: true, message: 'Category created', data: category });
  } catch (error) {
    if (error.code === 11000) return next(httpError(409, 'A category with this name already exists'));
    next(error);
  }
};

// PUT /api/v1/categories/:id (admin)
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name: readName(req.body) },
      { returnDocument: 'after', runValidators: true }
    );
    if (!category) throw httpError(404, `Category ${req.params.id} not found`);
    res.json({ success: true, message: 'Category updated', data: category });
  } catch (error) {
    if (error.code === 11000) return next(httpError(409, 'A category with this name already exists'));
    next(error);
  }
};

// DELETE /api/v1/categories/:id (admin)
exports.deleteCategory = async (req, res, next) => {
  try {
    // MongoDB has no foreign keys, so the "still has products" rule from Lab 4 is checked here
    if (await Product.exists({ categoryId: req.params.id })) {
      throw httpError(409, 'Cannot delete this category because it still has products');
    }
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) throw httpError(404, `Category ${req.params.id} not found`);
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
};

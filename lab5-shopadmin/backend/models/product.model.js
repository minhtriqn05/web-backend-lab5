// models/product.model.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: [true, 'categoryId is required'] },
    name: { type: String, required: [true, 'Product name is required'], trim: true, maxlength: 150 },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity must be >= 0'],
      validate: { validator: Number.isInteger, message: 'Quantity must be a whole number' }
    },
    price: { type: Number, required: true, min: [0, 'Price must be >= 0'] },
    // Lab 5 Ex3: out-of-stock products are archived automatically by a cron job
    status: { type: String, enum: ['active', 'archived'], default: 'active' }
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false } } // createdAt + updatedAt
);

module.exports = mongoose.model('Product', productSchema);

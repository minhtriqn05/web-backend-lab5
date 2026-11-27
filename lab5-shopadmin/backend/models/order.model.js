// models/order.model.js - Lab 5 homework, Requirement 1
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    // name and price are copied from the product when the order is placed,
    // so later price changes do not change old orders
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: {
      type: [orderItemSchema],
      validate: { validator: (items) => items.length > 0, message: 'An order needs at least one item' }
    },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' }
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false } } // createdAt is used by the revenue report
);

module.exports = mongoose.model('Order', orderSchema);

// scripts/seed.js - fill MongoDB with demo data:  npm run seed
// WARNING: deletes every category, product and order, then creates them again.
// Users are kept; two demo accounts are created if they do not exist yet.
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/user.model');
const Category = require('../models/category.model');
const Product = require('../models/product.model');
const Order = require('../models/order.model');
const { startOfTodayVN } = require('../jobs/dailyRevenueReport');

async function upsertUser(data, password) {
  const existing = await User.findOne({ email: data.email });
  if (existing) return existing;
  return User.create({ ...data, passwordHash: await bcrypt.hash(password, 10) });
}

(async () => {
  await connectDB();
  await Promise.all([Category.deleteMany({}), Product.deleteMany({}), Order.deleteMany({})]);

  const admin = await upsertUser({ fullName: 'Shop Admin', age: 30, gender: 'other', email: 'admin@shopadmin.local', type: 'admin' }, '123456');
  const customer = await upsertUser({ fullName: 'Demo Customer', age: 22, gender: 'female', email: 'customer@shopadmin.local', type: 'normal' }, '123456');

  const [beverage, fruit, food] = await Category.create([{ name: 'Beverage' }, { name: 'Fruit' }, { name: 'Food' }]);

  const products = await Product.create([
    { name: 'Pepsi', categoryId: beverage._id, quantity: 45, price: 15000 },
    { name: 'CocaCola', categoryId: beverage._id, quantity: 35, price: 15000 },
    { name: 'Lavie', categoryId: beverage._id, quantity: 150, price: 8000 },
    { name: 'Apple', categoryId: fruit._id, quantity: 50, price: 10000 },
    { name: 'Banana', categoryId: fruit._id, quantity: 30, price: 5000 },
    { name: 'Mango', categoryId: fruit._id, quantity: 2, price: 35000 },
    { name: 'Meat', categoryId: food._id, quantity: 5, price: 50000 },
    { name: 'Egg', categoryId: food._id, quantity: 20, price: 3000 }
  ]);
  const p = Object.fromEntries(products.map((x) => [x.name, x]));
  const line = (name, quantity) => ({ productId: p[name]._id, name, price: p[name].price, quantity });

  // Orders placed YESTERDAY (Vietnam time) so the daily revenue report has data to summarise
  const yesterday = (hour) => new Date(startOfTodayVN().getTime() - 24 * 3600 * 1000 + hour * 3600 * 1000);
  const orders = [
    { userId: customer._id, items: [line('Pepsi', 2), line('CocaCola', 2)], status: 'completed', createdAt: yesterday(9) },
    { userId: customer._id, items: [line('Banana', 3), line('Apple', 2)], status: 'completed', createdAt: yesterday(14) },
    { userId: admin._id, items: [line('Meat', 1), line('Egg', 10)], status: 'completed', createdAt: yesterday(18) },
    { userId: customer._id, items: [line('Lavie', 6)], status: 'cancelled', createdAt: yesterday(20) },
    { userId: customer._id, items: [line('Mango', 1)], status: 'pending', createdAt: new Date() }
  ].map((o) => ({ ...o, totalAmount: o.items.reduce((s, i) => s + i.price * i.quantity, 0) }));
  // insertMany keeps our createdAt (timestamps only fill missing values)
  await Order.insertMany(orders);

  console.log(`Seeded: 3 categories, ${products.length} products, ${orders.length} orders`);
  console.log('Demo accounts (password 123456): admin@shopadmin.local (admin), customer@shopadmin.local (normal)');
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error('Seed failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});

// config/db.js - connect Mongoose to MongoDB
const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lab5_shopadmin';
  await mongoose.connect(uri);
  console.log(`MongoDB connected - database "${mongoose.connection.name}"`);
}

module.exports = connectDB;

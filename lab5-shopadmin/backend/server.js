// server.js - ShopAdmin API (Lab 4 homework + Lab 5: Socket.IO, node-cron, orders, Google sign-in, Gmail)
require('dotenv').config({ quiet: true });
const http = require('http');
const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const { initSocket } = require('./socket');
const startJobs = require('./jobs');
const { UPLOAD_DIR } = require('./middleware/upload');
const { notFound, errorHandler } = require('./middleware/errorHandler');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors({
  origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/', (req, res) => res.json({ success: true, message: 'ShopAdmin API is running' }));
app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/users', require('./routes/user.routes'));
app.use('/api/v1/categories', require('./routes/category.routes'));
app.use('/api/v1/products', require('./routes/product.routes'));
app.use('/api/v1/orders', require('./routes/order.routes'));

app.use(notFound);
app.use(errorHandler);

// Socket.IO needs the raw http.Server, so we listen with httpServer, not app.listen
const httpServer = http.createServer(app);
const io = initSocket(httpServer);
app.set('io', io); // controllers read it with req.app.get('io')

connectDB()
  .then(() => {
    startJobs(); // only after MongoDB is connected
    httpServer.listen(PORT, () => console.log(`ShopAdmin API (HTTP + Socket.IO) running at http://localhost:${PORT}`));
    httpServer.on('error', (error) => {
      console.error(`Cannot start the server: ${error.message}`);
      process.exit(1);
    });
  })
  .catch((error) => {
    console.error('Could not connect to MongoDB:', error.message);
    process.exit(1);
  });

// server.js - Product Management API from Lab 4 (Exercise 1), now run under PM2 (Lab 5 - Exercise 1)
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

// CORS: allow a Web UI on another origin to call this API
app.use(cors({
  origin: '*', // in production, list the exact origins, e.g. 'http://localhost:3000'
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// GET /health - tells which PM2 worker (process id) answered the request
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, pid: process.pid, uptime: process.uptime() });
});

// GET /work - simulates a CPU-heavy request (about 20 ms of pure calculation),
// so the CPU column in "pm2 monit" clearly goes up during a burst test
app.get('/work', (req, res) => {
  const end = Date.now() + 20;
  let count = 0;
  while (Date.now() < end) count++; // busy loop on purpose
  res.status(200).json({ success: true, pid: process.pid, loops: count });
});

// GET /crash - kills ONLY the worker that receives this request (to test PM2 auto-restart).
// A plain "throw" inside a route is caught by Express and only returns a 500,
// so the error is thrown later, outside Express, with setTimeout.
app.get('/crash', (req, res) => {
  console.log(`Worker ${process.pid} is going to crash now...`);
  res.json({ success: true, message: `Worker ${process.pid} will crash`, pid: process.pid });
  setTimeout(() => { throw new Error('boom'); }, 0);
});

// Simulated in-memory database (note: in cluster mode every worker has its OWN copy)
let products = [
  { id: 1, name: 'Laptop Dell XPS 15', price: 35000000, category: 'Electronics' },
  { id: 2, name: 'Logitech MX Master 3S Mouse', price: 2400000, category: 'Accessories' }
];

// GET - list all products, or only one category with ?category=Electronics
app.get('/api/v1/products', (req, res) => {
  const { category } = req.query;
  let result = products;

  if (category) {
    // case-insensitive match, so ?category=electronics also works
    const wanted = category.trim().toLowerCase();
    result = products.filter(p => p.category.toLowerCase() === wanted);
  }

  res.json({ success: true, count: result.length, data: result });
});

// POST - create a product
app.post('/api/v1/products', (req, res) => {
  const { name, price, category } = req.body;
  if (!name || !price) {
    return res.status(400).json({ success: false, message: 'Product name and price are required!' });
  }
  const newProduct = { id: Date.now(), name, price: Number(price), category: category || 'General' };
  products.push(newProduct);
  res.status(201).json({ success: true, message: 'Product added successfully', data: newProduct });
});

// PUT - update a product by id (extended requirement 1)
app.put('/api/v1/products/:id', (req, res) => {
  const productId = Number(req.params.id);
  const product = products.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({ success: false, message: `Product ID ${req.params.id} not found` });
  }

  const { name, price, category } = req.body;

  // 400 - validate the new data before changing anything
  if (typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ success: false, message: 'Product name is required!' });
  }
  const newPrice = Number(price);
  if (price === undefined || price === '' || !Number.isFinite(newPrice) || newPrice <= 0) {
    return res.status(400).json({ success: false, message: 'Price must be a number greater than 0!' });
  }

  product.name = name.trim();
  product.price = newPrice;
  product.category = (typeof category === 'string' && category.trim()) ? category.trim() : 'General';

  res.json({ success: true, message: `Updated product ID ${productId}`, data: product });
});

// DELETE - remove a product by id
app.delete('/api/v1/products/:id', (req, res) => {
  const productId = Number(req.params.id);
  const exists = products.some(p => p.id === productId);
  if (!exists) {
    return res.status(404).json({ success: false, message: `Product ID ${productId} not found` });
  }
  products = products.filter(p => p.id !== productId);
  res.json({ success: true, message: `Deleted product ID ${productId}` });
});

app.listen(PORT, (error) => {
  // Express 5 passes the error here, e.g. when the port is already in use
  if (error) {
    console.error(`Cannot start the server: ${error.message}`);
    process.exit(1);
  }
  console.log(`Worker ${process.pid} - Backend API running at: http://localhost:${PORT}`);
});

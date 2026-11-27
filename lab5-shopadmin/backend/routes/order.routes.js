const express = require('express');
const router = express.Router();
const o = require('../controllers/order.controller');
const { protect, adminOnly } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

router.post('/', protect, o.createOrder);                                              // any logged-in user
router.get('/mine', protect, o.getMyOrders);                                           // the user's own orders
router.get('/', protect, adminOnly, o.getAllOrders);                                   // admin only
router.patch('/:id/status', protect, adminOnly, validateObjectId, o.updateOrderStatus); // admin only

module.exports = router;

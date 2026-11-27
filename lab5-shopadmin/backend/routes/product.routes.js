const express = require('express');
const router = express.Router();
const p = require('../controllers/product.controller');
const { protect, adminOnly } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

router.get('/', protect, p.getProducts);                                        // any logged-in user
router.get('/:id', protect, validateObjectId, p.getProduct);                    // any logged-in user
router.post('/', protect, adminOnly, p.createProduct);                          // admin only
router.put('/:id', protect, adminOnly, validateObjectId, p.updateProduct);      // admin only (+ real-time broadcast)
router.delete('/:id', protect, adminOnly, validateObjectId, p.deleteProduct);   // admin only

module.exports = router;

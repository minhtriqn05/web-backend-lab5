const express = require('express');
const router = express.Router();
const c = require('../controllers/category.controller');
const { protect, adminOnly } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

router.get('/', protect, c.getCategories);                                      // any logged-in user
router.post('/', protect, adminOnly, c.createCategory);                         // admin only
router.put('/:id', protect, adminOnly, validateObjectId, c.updateCategory);     // admin only
router.delete('/:id', protect, adminOnly, validateObjectId, c.deleteCategory);  // admin only

module.exports = router;

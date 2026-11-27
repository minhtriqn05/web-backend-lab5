const express = require('express');
const router = express.Router();
const { updateMe, uploadMyAvatar } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

// protect runs first, so multer already knows req.user.id when it names the file
router.put('/me', protect, updateMe);
router.post('/me/avatar', protect, uploadAvatar, uploadMyAvatar);

module.exports = router;

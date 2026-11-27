// middleware/upload.js - Multer disk storage for avatars (reused from Exercise 2)
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const httpError = require('../utils/httpError');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // e.g. avatar-user3-1731460000000-123456789.png
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-user${req.user.id}-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(httpError(400, 'Only image files are accepted (JPG, PNG, WEBP)!'), false);
  }
};

const uploadAvatar = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter
}).single('avatar');

module.exports = { uploadAvatar, UPLOAD_DIR };

// controllers/user.controller.js - the logged-in user's own profile (from Lab 4)
const fs = require('fs');
const path = require('path');
const User = require('../models/user.model');
const { UPLOAD_DIR } = require('../middleware/upload');
const httpError = require('../utils/httpError');

const GENDERS = ['male', 'female', 'other'];

// PUT /api/v1/users/me (protected) - only fullName, age and gender can be changed
exports.updateMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id); // always the user from the token
    if (!user) throw httpError(401, 'Unauthorized: this account no longer exists');

    const { fullName, age, gender } = req.body || {};
    if (fullName !== undefined) {
      if (typeof fullName !== 'string' || !fullName.trim()) throw httpError(400, 'Full name cannot be empty');
      user.fullName = fullName.trim();
    }
    if (age !== undefined && age !== null && age !== '') {
      const ageNumber = Number(age);
      if (!Number.isInteger(ageNumber) || ageNumber < 1 || ageNumber > 150) {
        throw httpError(400, 'Age must be a whole number between 1 and 150');
      }
      user.age = ageNumber;
    }
    if (gender !== undefined) {
      if (!GENDERS.includes(gender)) throw httpError(400, 'Gender must be male, female or other');
      user.gender = gender;
    }

    await user.save();
    res.json({ success: true, message: 'Profile updated', data: user });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/users/me/avatar (protected, multipart/form-data, field "avatar")
exports.uploadMyAvatar = async (req, res, next) => {
  try {
    if (!req.file) throw httpError(400, 'Please choose an image file!');

    const user = await User.findById(req.user.id);
    if (!user) throw httpError(401, 'Unauthorized: this account no longer exists');

    const oldUrl = user.avatarUrl;
    user.avatarUrl = `/uploads/${req.file.filename}`;
    await user.save();

    // Remove the old uploaded avatar (a Google picture URL is not a local file)
    if (oldUrl && oldUrl.startsWith('/uploads/')) {
      fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(oldUrl))).catch(() => {});
    }
    res.json({ success: true, message: 'Avatar updated', data: user });
  } catch (error) {
    if (req.file) fs.promises.unlink(req.file.path).catch(() => {});
    next(error);
  }
};

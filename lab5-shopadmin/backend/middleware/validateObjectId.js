// middleware/validateObjectId.js - :id must be a valid MongoDB ObjectId, otherwise 400
const mongoose = require('mongoose');

function validateObjectId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: `Invalid id "${req.params.id}"` });
  }
  next();
}

module.exports = validateObjectId;

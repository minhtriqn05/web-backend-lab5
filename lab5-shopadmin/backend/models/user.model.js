// models/user.model.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: [true, 'Full name is required'], trim: true, maxlength: 100 },
    age: { type: Number, min: 1, max: 150 },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,          // one account per email (password or Google)
      lowercase: true,
      trim: true
    },
    // bcrypt hash; empty for accounts that were created with "Sign in with Google".
    // select: false -> never loaded (or returned) unless a query asks for it with .select('+passwordHash')
    passwordHash: { type: String, select: false },
    googleId: { type: String, index: true },   // Google "sub" claim, set the first time the user signs in with Google
    avatarUrl: { type: String, default: null },
    type: { type: String, enum: ['normal', 'admin'], default: 'normal' }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.passwordHash; // never send the hash, even if it was selected
        delete ret.__v;
        return ret;
      }
    }
  }
);

module.exports = mongoose.model('User', userSchema);

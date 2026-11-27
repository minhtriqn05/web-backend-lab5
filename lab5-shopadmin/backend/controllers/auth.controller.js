// controllers/auth.controller.js - register, login, Google sign-in, me
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user.model');
const httpError = require('../utils/httpError');
const { ADMINS_ROOM } = require('../socket');

const SALT_ROUNDS = 10;
const GENDERS = ['male', 'female', 'other'];
const TYPES = ['normal', 'admin'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Same JWT for password login and Google login -> every middleware keeps working unchanged
function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), type: user.type },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

// Lab 5 Ex2 extended: tell every connected admin that somebody signed up
function notifyAdmins(req, user) {
  const io = req.app.get('io');
  io.to(ADMINS_ROOM).emit('newUserRegistered', {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    type: user.type
  });
}

// Check the sign-up form and return clean values (or throw a 400)
function validateRegister(body) {
  const { fullName, age, gender, email, password, type } = body;

  if (typeof fullName !== 'string' || !fullName.trim()) throw httpError(400, 'Full name is required');
  const ageNumber = Number(age);
  if (!Number.isInteger(ageNumber) || ageNumber < 1 || ageNumber > 150) {
    throw httpError(400, 'Age must be a whole number between 1 and 150');
  }
  if (!GENDERS.includes(gender)) throw httpError(400, 'Gender must be male, female or other');
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) throw httpError(400, 'A valid email is required');
  if (typeof password !== 'string' || password.length < 6) {
    throw httpError(400, 'Password must be at least 6 characters');
  }
  const accountType = type === undefined ? 'normal' : type;
  if (!TYPES.includes(accountType)) throw httpError(400, "Type must be 'normal' or 'admin'");

  return { fullName: fullName.trim(), age: ageNumber, gender, email: email.trim().toLowerCase(), password, type: accountType };
}

// POST /api/v1/auth/register
exports.register = async (req, res, next) => {
  try {
    const data = validateRegister(req.body || {});

    if (await User.exists({ email: data.email })) {
      throw httpError(409, `The email ${data.email} is already registered`);
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const user = await User.create({ ...data, passwordHash });

    notifyAdmins(req, user);
    res.status(201).json({ success: true, message: 'Account created successfully', data: user });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) throw httpError(400, 'Email and password are required');

    const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+passwordHash');
    // Google-only accounts have no passwordHash -> the same 401 as a wrong password
    const isMatch = user && user.passwordHash ? await bcrypt.compare(String(password), user.passwordHash) : false;
    if (!isMatch) throw httpError(401, 'Invalid email or password');

    res.json({ success: true, message: 'Logged in successfully', data: { token: signToken(user), user } });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/auth/google  body: { idToken }   (Lab 5 homework, Requirement 2)
exports.googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) throw httpError(400, 'idToken is required');

    // 1. Ask Google to check the signature and that the token was made for OUR client id
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
      payload = ticket.getPayload(); // { sub, email, email_verified, name, picture, ... }
    } catch (err) {
      throw httpError(401, 'Invalid Google token');
    }
    if (!payload.email || !payload.email_verified) throw httpError(401, 'Your Google email is not verified');

    // 2. Find-or-create by the VERIFIED email -> a password account with the same email is reused, not duplicated
    const email = payload.email.toLowerCase();
    let user = await User.findOne({ email });
    let isNew = false;

    if (user) {
      if (!user.googleId) {          // first Google sign-in of an existing password account -> link it
        user.googleId = payload.sub;
        if (!user.avatarUrl && payload.picture) user.avatarUrl = payload.picture;
        await user.save();
      }
    } else {
      user = await User.create({
        fullName: payload.name || email.split('@')[0],
        email,
        googleId: payload.sub,
        avatarUrl: payload.picture || null,
        type: 'normal'               // nobody becomes admin through Google
      });
      isNew = true;
      notifyAdmins(req, user);
    }

    // 3. Exactly the same response as /auth/login
    res.status(isNew ? 201 : 200).json({
      success: true,
      message: isNew ? 'Account created with Google' : 'Logged in with Google',
      data: { token: signToken(user), user }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/auth/me (protected)
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) throw httpError(401, 'Unauthorized: this account no longer exists');
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

import express from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import { signUserToken, cookieOptions } from '../utils/jwt.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      displayName: displayName || email.split('@')[0],
    });
    const token = signUserToken(user);
    res.cookie('token', token, cookieOptions());
    return res.status(201).json({ user: user.toSafeJSON(), token });
  } catch (e) {
    return res.status(500).json({ message: e.message || 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = signUserToken(user);
    res.cookie('token', token, cookieOptions());
    return res.json({ user: user.toSafeJSON(), token });
  } catch (e) {
    return res.status(500).json({ message: e.message || 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' });
  res.json({ message: 'Logged out' });
});

router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Not authenticated' });
    const jwt = await import('jsonwebtoken');
    const payload = jwt.default.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'User not found' });
    return res.json({ user: user.toSafeJSON() });
  } catch {
    return res.status(401).json({ message: 'Invalid session' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  const user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    user.resetToken = crypto.randomBytes(32).toString('hex');
    user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    // In production: send email with link containing resetToken
  }
  return res.json({
    message: 'If an account exists for this email, reset instructions have been recorded.',
    demoToken: process.env.NODE_ENV === 'development' && user ? user.resetToken : undefined,
  });
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 6) {
    return res.status(400).json({ message: 'Valid token and password (min 6 chars) required' });
  }
  const user = await User.findOne({
    resetToken: token,
    resetTokenExpires: { $gt: new Date() },
  });
  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired reset token' });
  }
  user.password = password;
  user.resetToken = null;
  user.resetTokenExpires = null;
  await user.save();
  return res.json({ message: 'Password updated. You can sign in now.' });
});

export default router;

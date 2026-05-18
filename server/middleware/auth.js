import jwt from 'jsonwebtoken';
import User from '../models/User.js';

function extractToken(req) {
  if (req.cookies?.token) return req.cookies.token;
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) return h.slice(7);
  return null;
}

export function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    req.userRole = payload.role;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return next();
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    req.userRole = payload.role;
    const user = await User.findById(payload.sub).select('email displayName avatarUrl role');
    req.user = user;
    next();
  } catch {
    next();
  }
}

export function requireAdmin(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

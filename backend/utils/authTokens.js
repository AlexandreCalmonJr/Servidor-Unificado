const jwt = require('jsonwebtoken');
const User = require('../models/User');
const secrets = require('../config/secrets');

const SESSION_COOKIE_NAME = 'mdm_session';
const DEFAULT_JWT_EXPIRES_IN = '2h';

function getJwtSecret() {
  const secret = secrets.JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET nao configurado');
  }
  return secret;
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN;
}

function signJwt(payload, options = {}) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: getJwtExpiresIn(),
    ...options,
  });
}

function verifyJwt(token) {
  return jwt.verify(token, getJwtSecret());
}

function parseDurationMs(value, fallbackMs) {
  const input = String(value || '').trim();
  const match = input.match(/^(\d+)([smhd])?$/i);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * (multipliers[unit] || 1000);
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.substring(7).trim() || null;
}

function getAuthHeaderToken(req) {
  return String(req.headers.auth_token || req.headers['auth-token'] || '').trim() || null;
}

function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  return raw
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const eq = part.indexOf('=');
      if (eq === -1) return acc;
      const key = decodeURIComponent(part.slice(0, eq));
      if (key === name) {
        acc = decodeURIComponent(part.slice(eq + 1));
      }
      return acc;
    }, null);
}

function getSessionToken(req) {
  return getCookie(req, SESSION_COOKIE_NAME);
}

function setSessionCookie(res, token) {
  const maxAge = parseDurationMs(getJwtExpiresIn(), 2 * 60 * 60 * 1000);
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge,
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

async function authenticateJwtToken(token) {
  const decoded = verifyJwt(token);
  const user = await User.findById(decoded.id).select('-password');
  if (!user) {
    const error = new Error('Usuario nao encontrado');
    error.name = 'UserNotFoundError';
    throw error;
  }

  const permissions = user.role === 'admin'
    ? ['mobile', 'totem', 'admin']
    : (user.permissions || []);

  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
    sector: user.sector || 'Global',
    permissions,
  };
}

module.exports = {
  SESSION_COOKIE_NAME,
  getJwtSecret,
  getJwtExpiresIn,
  signJwt,
  verifyJwt,
  getBearerToken,
  getAuthHeaderToken,
  getSessionToken,
  setSessionCookie,
  clearSessionCookie,
  authenticateJwtToken,
};

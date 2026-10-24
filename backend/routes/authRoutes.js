const express = require('express');
const { body } = require('express-validator');
const {
  registerUser,
  loginUser,
  logoutUser,
  listUsers,
  updateUser,
  deleteUser,
  verifyToken,
  changePassword,
} = require('../controllers/authController');
const authorize = require('../middleware/role');
const { loginLimiter } = require('../middleware/rateLimiters');
const {
  validateEmail,
  validatePassword,
  validateUsername,
  validatePermissions,
} = require('../utils/validators');

const validateSectorForUser = () => body('sector').custom((value, { req }) => {
  if (req.body.role === 'user' && (!value || !String(value).trim())) {
    throw new Error('Setor obrigatorio para usuarios comuns');
  }
  return true;
});

const validateRole = () => body('role')
  .isIn(['user', 'admin'])
  .withMessage('Permissao invalida');

const authRoutes = (logger, getApiLimiter, modifyApiLimiter, auth) => {
  const router = express.Router();

  router.post('/login', loginLimiter, [
    body('username').trim().notEmpty().withMessage('Username e obrigatorio'),
    body('password').notEmpty().withMessage('Senha e obrigatoria'),
  ], loginUser);

  router.post('/logout', logoutUser);

  router.get('/verify', auth, verifyToken);
  router.get('/validate', auth, verifyToken);

  router.post('/change-password', auth, modifyApiLimiter, [
    body('currentPassword').notEmpty().withMessage('Senha atual e obrigatoria'),
    validatePassword('newPassword'),
  ], changePassword);

  router.post('/register', auth, authorize('admin'), modifyApiLimiter, [
    validateUsername(),
    validateEmail(),
    validatePassword(),
    validateRole(),
    validateSectorForUser(),
    validatePermissions(),
  ], registerUser);

  router.get('/users', auth, authorize('admin'), getApiLimiter, listUsers);

  router.put('/users/:id', auth, authorize('admin'), modifyApiLimiter, [
    body('username').optional().trim().isLength({ min: 3, max: 50 }),
    body('email').optional().isEmail(),
    body('role').optional().isIn(['user', 'admin']),
    validateSectorForUser(),
    validatePermissions(),
  ], updateUser);

  router.delete('/users/:id', auth, authorize('admin'), modifyApiLimiter, deleteUser);

  return router;
};

module.exports = authRoutes;

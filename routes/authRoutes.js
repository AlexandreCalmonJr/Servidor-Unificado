// routes/authRoutes.js
const express = require('express');
const { body } = require('express-validator');
const {
  registerUser, loginUser, listUsers, updateUser,
  deleteUser, verifyToken, changePassword,
} = require('../controllers/authController');
const authorize = require('../middleware/role');

const authRoutes = (logger, getApiLimiter, modifyApiLimiter, auth) => {
  const router = express.Router();

  // ── Público ───────────────────────────────────────────────────────
  router.post('/login', modifyApiLimiter, [
    body('username').notEmpty().withMessage('Username é obrigatório'),
    body('password').notEmpty().withMessage('Senha é obrigatória'),
  ], loginUser);

  // ── Verificar token ───────────────────────────────────────────────
  router.get('/verify', auth, verifyToken);
  router.get('/validate', auth, verifyToken); // Alias para clientes mobile

  // ── Alterar senha (qualquer usuário autenticado) ──────────────────
  router.post('/change-password', auth, modifyApiLimiter, [
    body('currentPassword').notEmpty().withMessage('Senha atual é obrigatória'),
    body('newPassword').isLength({ min: 6 }).withMessage('Nova senha: mínimo 6 caracteres'),
  ], changePassword);

  // ── Admin only ────────────────────────────────────────────────────
  router.post('/register', auth, authorize('admin'), modifyApiLimiter, [
    body('username').notEmpty().withMessage('Username é obrigatório'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('Senha: mínimo 6 caracteres'),
    body('role').isIn(['user', 'admin']).withMessage('Permissão inválida'),
    body('sector').custom((value, { req }) => {
      if (req.body.role === 'user' && (!value || !value.trim())) throw new Error('Setor obrigatório para usuários comuns');
      return true;
    }),
    body('permissions').optional().isArray().custom((value, { req }) => {
      if (req.body.role === 'admin') return true;
      if (value) value.forEach(p => { if (!['mobile', 'totem'].includes(p)) throw new Error('Permissão inválida'); });
      return true;
    }),
  ], registerUser);

  router.get('/users', auth, authorize('admin'), getApiLimiter, listUsers);

  router.put('/users/:id', auth, authorize('admin'), modifyApiLimiter, [
    body('username').optional().notEmpty(),
    body('email').optional().isEmail(),
    body('role').optional().isIn(['user', 'admin']),
    body('sector').optional().custom((value, { req }) => {
      if (req.body.role === 'user' && (!value || !value.trim())) throw new Error('Setor obrigatório para usuários comuns');
      return true;
    }),
    body('permissions').optional().isArray().custom((value, { req }) => {
      if (req.body.role === 'admin') return true;
      if (value) value.forEach(p => { if (!['mobile', 'totem'].includes(p)) throw new Error('Permissão inválida'); });
      return true;
    }),
  ], updateUser);

  router.delete('/users/:id', auth, authorize('admin'), modifyApiLimiter, deleteUser);

  return router;
};

module.exports = authRoutes;

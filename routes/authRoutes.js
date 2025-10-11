const express = require('express');
const { body } = require('express-validator');
const { registerUser, loginUser, listUsers, updateUser, deleteUser, verifyToken, changePassword } = require('../controllers/authController');
const { modifyApiLimiter, getApiLimiter } = require('../middleware/rateLimiters');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');

const authRoutes = () => {
    const router = express.Router();

    // Rota pública para login
    router.post('/login', modifyApiLimiter, [
        body('username').notEmpty().withMessage('Username é obrigatório'),
        body('password').notEmpty().withMessage('Senha é obrigatória')
    ], loginUser);

    // Rota para verificar token (protegida)
    router.get('/verify', auth, verifyToken);

    // Rota para alterar senha (protegida - qualquer usuário logado)
    router.post('/change-password', auth, modifyApiLimiter, [
        body('currentPassword').notEmpty().withMessage('Senha atual é obrigatória'),
        body('newPassword').isLength({ min: 6 }).withMessage('A nova senha deve ter no mínimo 6 caracteres')
    ], changePassword);

    // Rotas protegidas (apenas admin)
    router.post('/register', auth, authorize('admin'), modifyApiLimiter, [
        body('username').notEmpty().withMessage('Username é obrigatório'),
        body('email').isEmail().withMessage('Email inválido'),
        body('password').isLength({ min: 6 }).withMessage('A senha deve ter no mínimo 6 caracteres'),
        body('role').isIn(['user', 'admin']).withMessage('Permissão inválida'),
        // Validação condicional para 'sector'
        body('sector').custom((value, { req }) => {
            if (req.body.role === 'user' && (!value || value.trim() === '')) {
                throw new Error('Setor é obrigatório para usuários comuns');
            }
            return true;
        })
    ], registerUser);

    router.get('/users', auth, authorize('admin'), getApiLimiter, listUsers);
    
    router.put('/users/:id', auth, authorize('admin'), modifyApiLimiter, [
        body('username').optional().notEmpty().withMessage('Username não pode ser vazio'),
        body('email').optional().isEmail().withMessage('Email inválido'),
        body('role').optional().isIn(['user', 'admin']).withMessage('Permissão inválida'),
        // Validação condicional para 'sector' na atualização
        body('sector').optional().custom((value, { req }) => {
            if (req.body.role === 'user' && (!value || value.trim() === '')) {
                throw new Error('Setor é obrigatório para usuários comuns');
            }
            return true;
        })
    ], updateUser);
    
    router.delete('/users/:id', auth, authorize('admin'), modifyApiLimiter, deleteUser);

    return router;
};

module.exports = authRoutes;

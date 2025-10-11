const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Função auxiliar para log seguro que previne crashes
const safeLog = (req, level, message) => {
    if (req.logger && typeof req.logger[level] === 'function') {
        req.logger[level](message);
    } else {
        // Fallback para console.log se o logger não estiver configurado
        console.log(`[LOG-${level.toUpperCase()}]: ${message}`);
    }
};

const registerUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false,
            message: 'Dados inválidos',
            errors: errors.array() 
        });
    }

    try {
        const { username, email, password, role, sector } = req.body;
        
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(409).json({ 
                success: false,
                message: 'Utilizador ou email já existe' 
            });
        }
        
        const user = new User({ username, email, password, role, sector });
        await user.save();
        
        safeLog(req, 'info', `Novo utilizador registado: ${username} (${role}) - Setor: ${sector}`);
        
        res.status(201).json({ 
            success: true,
            message: 'Utilizador registado com sucesso',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                sector: user.sector,
                created_at: user.created_at
            }
        });
    } catch (err) {
        safeLog(req, 'error', `Erro ao registar utilizador: ${err.message}`);
        res.status(500).json({ 
            success: false,
            message: 'Erro no servidor', 
            details: err.message 
        });
    }
};

const loginUser = async (req, res) => {
    // ... (código de login sem alterações, mas usando safeLog)
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        
        if (!user || !(await user.comparePassword(password))) {
            safeLog(req, 'warn', `Tentativa de login inválida para utilizador: ${username} - IP: ${req.ip}`);
            return res.status(401).json({ 
                success: false,
                message: 'Credenciais inválidas' 
            });
        }
        
        const tokenPayload = {
            id: user._id,
            role: user.role,
            username: user.username,
            sector: user.sector
        };
        
        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );
        
        safeLog(req, 'info', `Login bem-sucedido: ${username} (${user.role}) - Setor: ${user.sector} - IP: ${req.ip}`);
        
        res.status(200).json({ 
            success: true,
            message: 'Login realizado com sucesso',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                sector: user.sector
            }
        });
    } catch (err) {
        safeLog(req, 'error', `Erro no login: ${err.message}`);
        res.status(500).json({ 
            success: false,
            message: 'Erro no servidor', 
            details: err.message 
        });
    }
};

const listUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').lean();
        
        safeLog(req, 'info', `Lista de utilizadores solicitada por: ${req.user.username}`);
        
        res.status(200).json({
            success: true,
            message: 'Utilizadores listados com sucesso',
            users,
            total: users.length
        });
    } catch (err) {
        safeLog(req, 'error', `Erro ao listar utilizadores: ${err.message}`);
        res.status(500).json({ 
            success: false,
            message: 'Erro ao listar utilizadores', 
            details: err.message 
        });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        delete updates.password;
        delete updates._id;
        delete updates.created_at;

        const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).select('-password');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utilizador não encontrado' });
        }
        
        safeLog(req, 'info', `Utilizador atualizado: ${user.username} por ${req.user.username}`);
        
        res.status(200).json({ success: true, message: 'Utilizador atualizado com sucesso', user });
    } catch (err) {
        safeLog(req, 'error', `Erro ao atualizar utilizador: ${err.message}`);
        res.status(500).json({ success: false, message: 'Erro ao atualizar utilizador', details: err.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (id === req.user.id) {
            return res.status(400).json({ success: false, message: 'Você não pode eliminar a sua própria conta' });
        }
        
        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utilizador não encontrado' });
        }
        
        safeLog(req, 'info', `Utilizador eliminado: ${user.username} por ${req.user.username}`);
        
        res.status(200).json({ success: true, message: 'Utilizador excluído com sucesso' });
    } catch (err) {
        safeLog(req, 'error', `Erro ao excluir utilizador: ${err.message}`);
        res.status(500).json({ success: false, message: 'Erro ao excluir utilizador', details: err.message });
    }
};

const verifyToken = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utilizador não encontrado' });
        }
        res.status(200).json({
            success: true,
            message: 'Token válido',
            user: { id: user._id, username: user.username, email: user.email, role: user.role, sector: user.sector }
        });
    } catch (err) {
        safeLog(req, 'error', `Erro ao verificar token: ${err.message}`);
        res.status(500).json({ success: false, message: 'Erro no servidor', details: err.message });
    }
};

const changePassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Dados inválidos', errors: errors.array() });
    }
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utilizador não encontrado' });
        }
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            safeLog(req, 'warn', `Tentativa de alteração de senha com senha atual incorreta: ${user.username} - IP: ${req.ip}`);
            return res.status(401).json({ success: false, message: 'Senha atual incorreta' });
        }
        user.password = newPassword;
        await user.save();
        safeLog(req, 'info', `Senha alterada com sucesso: ${user.username} - IP: ${req.ip}`);
        res.status(200).json({ success: true, message: 'Senha alterada com sucesso' });
    } catch (err) {
        safeLog(req, 'error', `Erro ao alterar senha: ${err.message}`);
        res.status(500).json({ success: false, message: 'Erro no servidor', details: err.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    listUsers,
    updateUser,
    deleteUser,
    verifyToken,
    changePassword
};

// Ficheiro: controllers/authController.js

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
        const { username, email, password, role, sector, permissions } = req.body;
        
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(409).json({ 
                success: false,
                message: 'Utilizador ou email já existe' 
            });
        }
        
        // Para admins, define permissões completas automaticamente
        const userData = { username, email, password, role, sector };
        if (role === 'admin') {
            userData.permissions = ['mobile', 'totem', 'admin'];
            userData.sector = 'Global'; // Admins sempre têm setor Global
        } else if (permissions && Array.isArray(permissions)) {
            userData.permissions = permissions.filter(p => ['mobile', 'totem'].includes(p));
        } else {
            userData.permissions = [];
        }
        
        const user = new User(userData);
        await user.save();
        
        safeLog(req, 'info', `Novo utilizador registado: ${username} (${role}) - Setor: ${user.sector} - Permissões: ${user.permissions.join(', ')}`);
        
        // IMPORTANTE: Retornar o usuário completo com TODOS os campos necessários
        const userResponse = {
            _id: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role,
            sector: user.sector || 'Global',
            permissions: user.permissions || [],
            created_at: user.created_at || new Date().toISOString()
        };
        
        res.status(201).json({ 
            success: true,
            message: 'Utilizador registado com sucesso',
            user: userResponse // Retorna o objeto user completo
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
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        
        if (!user || !(await user.comparePassword(password))) {
            safeLog(req, 'warn', `Tentativa de login falha: ${username} - IP: ${req.ip}`);
            return res.status(401).json({ 
                success: false, 
                message: 'Credenciais inválidas' 
            });
        }
        
        // Gera token com payload incluindo role, permissions e sector
        const permissions = user.role === 'admin' ? ['mobile', 'totem', 'admin'] : (user.permissions || []);
        const tokenPayload = {
            id: user._id,
            username: user.username,
            role: user.role,
            sector: user.sector || 'Global',
            permissions: permissions
        };
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
        
        const userResponse = {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            sector: user.sector || 'Global',
            permissions
        };
        
        safeLog(req, 'info', `Autenticação bem-sucedida (JWT) para usuário: ${user.username}, Setor: ${user.sector || 'Desconhecido'}`);
        
        res.status(200).json({ 
            success: true, 
            token, 
            user: userResponse 
        });
    } catch (err) {
        safeLog(req, 'error', `Erro no login: ${err.message}`);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
};

const listUsers = async (req, res) => {
    try {
        const users = await User.find({}, '-password').sort({ created_at: -1 });
        const usersResponse = users.map(user => {
            const permissions = user.role === 'admin' ? ['mobile', 'totem', 'admin'] : (user.permissions || []);
            return {
                _id: user._id.toString(),
                username: user.username,
                email: user.email,
                role: user.role,
                sector: user.sector || 'Global',
                permissions,
                created_at: user.created_at || new Date().toISOString()
            };
        });
        safeLog(req, 'info', `Lista de utilizadores solicitada por ${req.user.username}: ${users.length} utilizadores`);
        res.status(200).json({ 
            success: true, 
            users: usersResponse 
        });
    } catch (err) {
        safeLog(req, 'error', `Erro ao listar utilizadores: ${err.message}`);
        res.status(500).json({ success: false, message: 'Erro ao listar utilizadores', details: err.message });
    }
};

const updateUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Dados inválidos', errors: errors.array() });
    }
    try {
        const { id } = req.params;
        const { username, email, role, sector, permissions } = req.body;
        const user = await User.findById(id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utilizador não encontrado' });
        }
        
        if (user.role === 'admin' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Não autorizado a editar admins' });
        }
        
        // Atualiza apenas campos fornecidos
        if (username) user.username = username;
        if (email) user.email = email;
        if (role) {
            user.role = role;
            // Se mudou para admin, ajusta setor e permissões
            if (role === 'admin') {
                user.sector = 'Global';
                user.permissions = ['mobile', 'totem', 'admin'];
            }
        }
        if (sector !== undefined && role !== 'admin') user.sector = sector;
        
        // Atualiza permissões apenas se não for admin ou se está mudando de admin para user
        if (role !== 'admin' && permissions && Array.isArray(permissions)) {
            user.permissions = permissions.filter(p => ['mobile', 'totem'].includes(p));
        }
        
        await user.save();
        
        const updatedPermissions = user.role === 'admin' ? ['mobile', 'totem', 'admin'] : (user.permissions || []);
        const userResponse = {
            _id: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role,
            sector: user.sector || 'Global',
            permissions: updatedPermissions,
            created_at: user.created_at || new Date().toISOString()
        };
        
        safeLog(req, 'info', `Utilizador atualizado: ${user.username} (${user.role}) - Setor: ${user.sector} - Permissões: ${updatedPermissions.join(', ')}`);
        res.status(200).json({ 
            success: true, 
            message: 'Utilizador atualizado com sucesso', 
            user: userResponse 
        });
    } catch (err) {
        safeLog(req, 'error', `Erro ao atualizar utilizador: ${err.message}`);
        res.status(500).json({ success: false, message: 'Erro ao atualizar utilizador', details: err.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utilizador não encontrado' });
        }
        
        if (user.role === 'admin' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Não autorizado a excluir admins' });
        }
        
        await User.findByIdAndDelete(id);
        safeLog(req, 'info', `Utilizador excluído: ${user.username}`);
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
        const permissions = user.role === 'admin' ? ['mobile', 'totem', 'admin'] : (user.permissions || []);
        res.status(200).json({
            success: true,
            message: 'Token válido',
            user: { 
                id: user._id, 
                username: user.username, 
                email: user.email, 
                role: user.role, 
                sector: user.sector || 'Global',
                permissions
            }
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
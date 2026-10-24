const { validationResult } = require('express-validator');
const User = require('../models/User');
const { signJwt, setSessionCookie, clearSessionCookie } = require('../utils/authTokens');

const safeLog = (req, level, message) => {
  if (req.logger && typeof req.logger[level] === 'function') {
    req.logger[level](message);
  } else {
    console.log(`[LOG-${level.toUpperCase()}]: ${message}`);
  }
};

const publicUser = (user) => {
  const permissions = user.role === 'admin'
    ? ['mobile', 'totem', 'admin']
    : (user.permissions || []);

  return {
    id: user._id,
    _id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
    sector: user.sector || 'Global',
    permissions,
    created_at: user.created_at || new Date().toISOString(),
  };
};

const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados invalidos',
      errors: errors.array(),
    });
  }

  try {
    const { username, email, password, role, sector, permissions } = req.body;

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Utilizador ou email ja existe',
      });
    }

    const userData = { username, email, password, role, sector };
    if (role === 'admin') {
      userData.permissions = ['mobile', 'totem', 'admin'];
      userData.sector = 'Global';
    } else if (Array.isArray(permissions)) {
      userData.permissions = permissions.filter((p) => ['mobile', 'totem'].includes(p));
    } else {
      userData.permissions = [];
    }

    const user = new User(userData);
    await user.save();

    safeLog(req, 'info', `Novo utilizador registado: ${username} (${role})`);

    return res.status(201).json({
      success: true,
      message: 'Utilizador registado com sucesso',
      user: publicUser(user),
    });
  } catch (err) {
    safeLog(req, 'error', `Erro ao registar utilizador: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro no servidor',
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
        message: 'Credenciais invalidas',
      });
    }

    const permissions = user.role === 'admin'
      ? ['mobile', 'totem', 'admin']
      : (user.permissions || []);

    const token = signJwt({
      id: user._id,
      username: user.username,
      role: user.role,
      sector: user.sector || 'Global',
      permissions,
    });

    setSessionCookie(res, token);
    safeLog(req, 'info', `Autenticacao bem-sucedida para usuario: ${user.username}`);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        sector: user.sector || 'Global',
        permissions,
      },
    });
  } catch (err) {
    safeLog(req, 'error', `Erro no login: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

const logoutUser = async (req, res) => {
  clearSessionCookie(res);
  return res.status(200).json({ success: true, message: 'Logout efetuado' });
};

const listUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ created_at: -1 });
    safeLog(req, 'info', `Lista de utilizadores solicitada por ${req.user.username}`);
    return res.status(200).json({
      success: true,
      users: users.map(publicUser),
    });
  } catch (err) {
    safeLog(req, 'error', `Erro ao listar utilizadores: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao listar utilizadores' });
  }
};

const updateUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Dados invalidos', errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { username, email, role, sector, permissions } = req.body;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilizador nao encontrado' });
    }

    if (user.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Nao autorizado a editar admins' });
    }

    if (username) user.username = username;
    if (email) user.email = email;

    const nextRole = role || user.role;
    if (role) {
      user.role = role;
      if (role === 'admin') {
        user.sector = 'Global';
        user.permissions = ['mobile', 'totem', 'admin'];
      }
    }

    if (sector !== undefined && nextRole !== 'admin') user.sector = sector;
    if (nextRole !== 'admin' && Array.isArray(permissions)) {
      user.permissions = permissions.filter((p) => ['mobile', 'totem'].includes(p));
    }

    await user.save();

    safeLog(req, 'info', `Utilizador atualizado: ${user.username}`);
    return res.status(200).json({
      success: true,
      message: 'Utilizador atualizado com sucesso',
      user: publicUser(user),
    });
  } catch (err) {
    safeLog(req, 'error', `Erro ao atualizar utilizador: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao atualizar utilizador' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilizador nao encontrado' });
    }

    if (user.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Nao autorizado a excluir admins' });
    }

    await User.findByIdAndDelete(id);
    safeLog(req, 'info', `Utilizador excluido: ${user.username}`);
    return res.status(200).json({ success: true, message: 'Utilizador excluido com sucesso' });
  } catch (err) {
    safeLog(req, 'error', `Erro ao excluir utilizador: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao excluir utilizador' });
  }
};

const verifyToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, valid: false, message: 'Utilizador nao encontrado' });
    }

    return res.status(200).json({
      success: true,
      valid: true,
      message: 'Token valido',
      user: publicUser(user),
    });
  } catch (err) {
    safeLog(req, 'error', `Erro ao verificar token: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Erro no servidor' });
  }
};

const changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Dados invalidos', errors: errors.array() });
  }

  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilizador nao encontrado' });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      safeLog(req, 'warn', `Tentativa de alteracao de senha com senha atual incorreta: ${user.username}`);
      return res.status(401).json({ success: false, message: 'Senha atual incorreta' });
    }

    user.password = newPassword;
    await user.save();

    safeLog(req, 'info', `Senha alterada com sucesso: ${user.username}`);
    return res.status(200).json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (err) {
    safeLog(req, 'error', `Erro ao alterar senha: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Erro no servidor' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  listUsers,
  updateUser,
  deleteUser,
  verifyToken,
  changePassword,
};

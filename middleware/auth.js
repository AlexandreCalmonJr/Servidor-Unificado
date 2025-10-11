const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.logger.warn(`Tentativa de acesso sem token: ${req.ip}`);
        return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }

    // Tenta validar como JWT (nova lógica)
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Garante que 'sector' está no req.user para filtragem
        req.user = { ...decoded, sector: decoded.sector || 'Desconhecido' }; 
        req.logger.info(`Autenticação bem-sucedida (JWT) para usuário: ${decoded.username}, Setor: ${req.user.sector}`);
        return next();
    } catch (err) {
        req.logger.debug(`Falha na validação JWT: ${err.message}`);
    }

    // Tenta validar como token estático (lógica legacy)
    if (token === process.env.AUTH_TOKEN) {
        // Para compatibilidade, define um usuário "genérico" com role 'admin' e setor 'Global'
        req.user = { role: 'admin', username: 'legacy_user', sector: 'Global' }; 
        req.logger.info(`Autenticação bem-sucedida (Legacy Token)`);
        return next();
    }

    // Se nenhuma das autenticações funcionou
    req.logger.warn(`Tentativa de acesso com token inválido: ${req.ip}`);
    res.status(403).json({ error: 'Token inválido' });
};

module.exports = auth;

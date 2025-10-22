const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    // Os headers HTTP são 'case-insensitive', o Express converte para minúsculas
    const authHeader = req.headers['authorization'];
    const staticToken = req.headers['auth_token'];

    // 1. Tenta validar como JWT (nova lógica)
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                // Garante que 'sector' está no req.user para filtragem
                req.user = { ...decoded, sector: decoded.sector || 'Desconhecido' }; 
                req.logger.info(`Autenticação bem-sucedida (JWT) para usuário: ${decoded.username}, Setor: ${req.user.sector}`);
                return next();
            } catch (err) {
                req.logger.debug(`Falha na validação JWT: ${err.message}. A tentar token estático.`);
                // Se falhar o JWT, não retorna erro ainda, deixa tentar o token estático
            }
        }
    }

    // 2. Tenta validar como token estático (lógica legacy)
    if (staticToken) {
        if (staticToken === process.env.AUTH_TOKEN) {
            // Para compatibilidade, define um usuário "genérico" com role 'admin' e setor 'Global'
            req.user = { role: 'admin', username: 'legacy_user', sector: 'Global' }; 
            req.logger.info(`Autenticação bem-sucedida (Legacy Token)`);
            return next();
        } else {
            // Encontrou um header auth_token, mas o valor está errado
            req.logger.warn(`Tentativa de acesso com token estático inválido: ${req.ip}`);
            return res.status(403).json({ error: 'Token inválido' });
        }
    }

    // 3. Se nenhuma das autenticações funcionou
    req.logger.warn(`Tentativa de acesso sem token (Headers verificados: authorization, auth_token): ${req.ip}`);
    res.status(401).json({ error: 'Token de autenticação não fornecido' });
};

module.exports = auth;

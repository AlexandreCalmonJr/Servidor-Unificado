const authorize = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        if (!req.user || (roles.length > 0 && !roles.includes(req.user.role))) {
            return res.status(403).json({ error: 'Acesso negado: você não tem permissão para realizar esta ação' });
        }
        next();
    };
};

module.exports = authorize;

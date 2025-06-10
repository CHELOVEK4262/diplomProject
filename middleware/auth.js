// Middleware для проверки аутентификации
function requireAuth(req, res, next) {
    if (!req.session.user) return res.redirect('/');
    next();
}

// Middleware для проверки прав администратора
function requireAdmin(req, res, next) {
    if (req.session.user?.role !== 'admin') {
        return res.status(403).send('Доступ запрещен');
    }
    next();
}

module.exports = {
    requireAuth,
    requireAdmin
};
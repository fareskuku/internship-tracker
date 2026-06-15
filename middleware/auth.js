const db = require('../config/db');

const authMiddleware = async (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    
    const result = await db.query('SELECT id, fullname, email, role FROM users WHERE id = $1', [req.session.userId]);
    if (result.rows.length === 0) {
        req.session.destroy();
        return res.redirect('/auth/login');
    }
    
    req.user = result.rows[0];
    res.locals.user = req.user;
    next();
};

const roleMiddleware = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.redirect('/auth/login');
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).render('error', { message: 'Access Denied. You do not have permission.' });
        }
        next();
    };
};

module.exports = { authMiddleware, roleMiddleware };
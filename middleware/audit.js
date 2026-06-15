const db = require('../config/db');

const auditLog = async (req, action, entity_type, entity_id, old_data = null, new_data = null) => {
    try {
        await db.query(
            `INSERT INTO audit_logs (user_id, user_email, user_role, action, entity_type, entity_id, old_data, new_data, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                req.user?.id,
                req.user?.email,
                req.user?.role,
                action,
                entity_type,
                entity_id,
                old_data ? JSON.stringify(old_data) : null,
                new_data ? JSON.stringify(new_data) : null,
                req.ip
            ]
        );
    } catch (error) {
        console.error('Audit failed:', error.message);
    }
};

module.exports = { auditLog };
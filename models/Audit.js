const db = require('../config/db');

const Audit = {
    getAll: async (limit = 100) => {
        const result = await db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1', [limit]);
        return result.rows;
    },

    getByUser: async (user_id) => {
        const result = await db.query('SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC', [user_id]);
        return result.rows;
    }
};

module.exports = Audit;
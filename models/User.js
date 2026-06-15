const db = require('../config/db');
const bcrypt = require('bcrypt');

const User = {
    create: async (userData) => {
        const { fullname, email, password, university, course, role = 'student' } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.query(
            `INSERT INTO users (fullname, email, password, university, course, role) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, fullname, email, role`,
            [fullname, email, hashedPassword, university, course, role]
        );
        return result.rows[0];
    },

    findByEmail: async (email) => {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0];
    },

    findById: async (id) => {
        const result = await db.query('SELECT id, fullname, email, role, university, course FROM users WHERE id = $1', [id]);
        return result.rows[0];
    },

    getAll: async () => {
        const result = await db.query('SELECT id, fullname, email, role, university, course FROM users ORDER BY created_at DESC');
        return result.rows;
    },

    updateRole: async (userId, role) => {
        const result = await db.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, fullname, email, role', [role, userId]);
        return result.rows[0];
    }
};

module.exports = User;
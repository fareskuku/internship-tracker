const db = require('../config/db');

const Application = {
    create: async (data) => {
        const { user_id, company_name, position, location, application_date, deadline, status, interview_date, notes, contact_person, contact_email } = data;
        const result = await db.query(
            `INSERT INTO applications (user_id, company_name, position, location, application_date, deadline, status, interview_date, notes, contact_person, contact_email) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [user_id, company_name, position, location, application_date || new Date(), deadline, status || 'pending', interview_date, notes, contact_person, contact_email]
        );
        return result.rows[0];
    },

    getAllByUser: async (user_id) => {
        const result = await db.query('SELECT * FROM applications WHERE user_id = $1 ORDER BY created_at DESC', [user_id]);
        return result.rows;
    },

    getAll: async () => {
        const result = await db.query(`SELECT a.*, u.fullname as student_name, u.email as student_email 
                                       FROM applications a JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC`);
        return result.rows;
    },

    getById: async (id) => {
        const result = await db.query(`SELECT a.*, u.fullname as student_name, u.email as student_email 
                                       FROM applications a JOIN users u ON a.user_id = u.id WHERE a.id = $1`, [id]);
        return result.rows[0];
    },

    update: async (id, data) => {
        const { company_name, position, location, application_date, deadline, status, interview_date, notes, contact_person, contact_email } = data;
        const result = await db.query(
            `UPDATE applications SET company_name=$1, position=$2, location=$3, application_date=$4, deadline=$5, status=$6, interview_date=$7, notes=$8, contact_person=$9, contact_email=$10, updated_at=CURRENT_TIMESTAMP WHERE id=$11 RETURNING *`,
            [company_name, position, location, application_date, deadline, status, interview_date, notes, contact_person, contact_email, id]
        );
        return result.rows[0];
    },

    delete: async (id) => {
        await db.query('DELETE FROM applications WHERE id = $1', [id]);
        return true;
    },

    getStats: async (user_id = null) => {
        let query = `SELECT COUNT(*) as total,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) as reviewed,
                    SUM(CASE WHEN status = 'interview' THEN 1 ELSE 0 END) as interview,
                    SUM(CASE WHEN status = 'offered' THEN 1 ELSE 0 END) as offered,
                    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
                    FROM applications`;
        if (user_id) {
            query += ` WHERE user_id = $1`;
            const result = await db.query(query, [user_id]);
            return result.rows[0];
        }
        const result = await db.query(query);
        return result.rows[0];
    }
};

module.exports = Application;
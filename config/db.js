const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'internship_tracker',
    password: 'postgres123'  
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
    } else {
        console.log('✅ Connected to PostgreSQL');
        release();
    }
});

module.exports = pool;
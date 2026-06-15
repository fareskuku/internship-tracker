const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./config/db');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('index');
});

app.get('/register', (req, res) => {
    res.render('auth/register', { error: null });
});

app.post('/register', async (req, res) => {
    try {
        const { fullname, email, password, university, course } = req.body;
        
        if (!fullname || !email || !password) {
            return res.render('auth/register', { error: 'All fields are required' });
        }
        
        const existing = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (existing.rows.length > 0) {
            return res.render('auth/register', { error: 'Email already registered' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await db.query(
            `INSERT INTO users (fullname, email, password, university, course, role) 
             VALUES ($1, $2, $3, $4, $5, 'student') RETURNING id, fullname, email, role`,
            [fullname, email, hashedPassword, university, course]
        );
        
        req.session.user = result.rows[0];
        req.session.userId = result.rows[0].id;
        
        res.redirect('/dashboard');
        
    } catch (error) {
        console.error(error);
        res.render('auth/register', { error: 'Registration failed' });
    }
});

app.get('/login', (req, res) => {
    res.render('auth/login', { error: null });
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.render('auth/login', { error: 'Invalid email or password' });
        }
        
        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password);
        
        if (!valid) {
            return res.render('auth/login', { error: 'Invalid email or password' });
        }
        
        req.session.user = {
            id: user.id,
            fullname: user.fullname,
            email: user.email,
            role: user.role
        };
        req.session.userId = user.id;
        
        res.redirect('/dashboard');
        
    } catch (error) {
        console.error(error);
        res.render('auth/login', { error: 'An error occurred' });
    }
});

app.get('/dashboard', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    try {
        const statsResult = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'interview' THEN 1 ELSE 0 END) as interview,
                SUM(CASE WHEN status = 'offered' THEN 1 ELSE 0 END) as offered,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
            FROM applications WHERE user_id = $1
        `, [req.session.userId]);
        
        const recentResult = await db.query(
            'SELECT * FROM applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
            [req.session.userId]
        );
        
        const stats = statsResult.rows[0] || { total: 0, pending: 0, interview: 0, offered: 0, rejected: 0 };
        
        res.render('applications/dashboard', { 
            stats: stats,
            applications: recentResult.rows
        });
    } catch (error) {
        console.error(error);
        res.send('Error loading dashboard');
    }
});

app.get('/applications', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    const result = await db.query('SELECT * FROM applications WHERE user_id = $1 ORDER BY created_at DESC', [req.session.userId]);
    res.render('applications/list', { applications: result.rows });
});

app.get('/applications/add', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('applications/add', { error: null });
});

app.post('/applications', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    try {
        const { company_name, position, location, deadline, status, notes } = req.body;
        await db.query(
            `INSERT INTO applications (user_id, company_name, position, location, deadline, status, notes) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [req.session.userId, company_name, position, location, deadline, status || 'pending', notes]
        );
        res.redirect('/applications');
    } catch (error) {
        console.error(error);
        res.render('applications/add', { error: 'Failed to add application' });
    }
});

app.get('/applications/:id/edit', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    const result = await db.query('SELECT * FROM applications WHERE id = $1 AND user_id = $2', [req.params.id, req.session.userId]);
    if (result.rows.length === 0) return res.redirect('/applications');
    res.render('applications/edit', { application: result.rows[0], error: null });
});

app.post('/applications/:id/update', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    const { company_name, position, location, deadline, status, notes } = req.body;
    await db.query(
        `UPDATE applications SET company_name=$1, position=$2, location=$3, deadline=$4, status=$5, notes=$6 
         WHERE id=$7 AND user_id=$8`,
        [company_name, position, location, deadline, status, notes, req.params.id, req.session.userId]
    );
    res.redirect('/applications');
});

app.post('/applications/:id/delete', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    await db.query('DELETE FROM applications WHERE id = $1 AND user_id = $2', [req.params.id, req.session.userId]);
    res.redirect('/applications');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.use((req, res) => {
    res.status(404).render('error', { message: 'Page not found' });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
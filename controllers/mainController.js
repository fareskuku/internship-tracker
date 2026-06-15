const bcrypt = require('bcrypt');
const User = require('../models/User');
const Application = require('../models/Application');
const Audit = require('../models/Audit');
const { auditLog } = require('../middleware/audit');

const authController = {
    showLogin: (req, res) => {
        res.render('auth/login', { error: null });
    },

    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            const user = await User.findByEmail(email);
            
            if (!user || !(await bcrypt.compare(password, user.password))) {
                return res.render('auth/login', { error: 'Invalid email or password' });
            }
            
            req.session.userId = user.id;
            req.session.user = { id: user.id, email: user.email, role: user.role };
            await auditLog(req, 'LOGIN', 'auth', user.id);
            res.redirect('/dashboard');
        } catch (error) {
            res.render('auth/login', { error: 'An error occurred' });
        }
    },

    showRegister: (req, res) => {
        res.render('auth/register', { error: null });
    },

    register: async (req, res) => {
        try {
            const { fullname, email, password, university, course } = req.body;
            const existing = await User.findByEmail(email);
            if (existing) {
                return res.render('auth/register', { error: 'Email already registered' });
            }
            
            const user = await User.create({ fullname, email, password, university, course });
            req.session.userId = user.id;
            req.session.user = { id: user.id, email: user.email, role: user.role };
            await auditLog(req, 'REGISTER', 'user', user.id);
            res.redirect('/dashboard');
        } catch (error) {
            res.render('auth/register', { error: 'Registration failed' });
        }
    },

    logout: async (req, res) => {
        await auditLog(req, 'LOGOUT', 'auth', req.session.userId);
        req.session.destroy();
        res.redirect('/auth/login');
    }
};

const applicationController = {
    dashboard: async (req, res) => {
        try {
            let stats, applications;
            if (req.user.role === 'admin' || req.user.role === 'advisor') {
                stats = await Application.getStats();
                applications = await Application.getAll();
            } else {
                stats = await Application.getStats(req.user.id);
                applications = await Application.getAllByUser(req.user.id);
            }
            res.render('applications/dashboard', { stats, applications: applications.slice(0, 5) });
        } catch (error) {
            res.status(500).send('Server Error');
        }
    },

    list: async (req, res) => {
        try {
            let applications;
            if (req.user.role === 'admin' || req.user.role === 'advisor') {
                applications = await Application.getAll();
            } else {
                applications = await Application.getAllByUser(req.user.id);
            }
            res.render('applications/list', { applications });
        } catch (error) {
            res.status(500).send('Server Error');
        }
    },

    showAddForm: (req, res) => {
        res.render('applications/add', { error: null });
    },

    create: async (req, res) => {
        try {
            const data = { ...req.body, user_id: req.user.id };
            const app = await Application.create(data);
            await auditLog(req, 'CREATE_APPLICATION', 'application', app.id, null, app);
            res.redirect('/applications');
        } catch (error) {
            res.render('applications/add', { error: 'Failed to create application' });
        }
    },

    view: async (req, res) => {
        try {
            const app = await Application.getById(req.params.id);
            if (!app) return res.status(404).send('Not found');
            if (req.user.role === 'student' && app.user_id !== req.user.id) {
                return res.status(403).send('Access denied');
            }
            res.render('applications/view', { application: app });
        } catch (error) {
            res.status(500).send('Server Error');
        }
    },

    showEditForm: async (req, res) => {
        try {
            const app = await Application.getById(req.params.id);
            if (!app) return res.status(404).send('Not found');
            if (req.user.role === 'student' && app.user_id !== req.user.id) {
                return res.status(403).send('Access denied');
            }
            res.render('applications/edit', { application: app, error: null });
        } catch (error) {
            res.status(500).send('Server Error');
        }
    },

    update: async (req, res) => {
        try {
            const oldApp = await Application.getById(req.params.id);
            const updated = await Application.update(req.params.id, req.body);
            await auditLog(req, 'UPDATE_APPLICATION', 'application', updated.id, oldApp, updated);
            res.redirect('/applications');
        } catch (error) {
            res.status(500).send('Server Error');
        }
    },

    delete: async (req, res) => {
        try {
            const app = await Application.getById(req.params.id);
            await Application.delete(req.params.id);
            await auditLog(req, 'DELETE_APPLICATION', 'application', req.params.id, app, null);
            res.redirect('/applications');
        } catch (error) {
            res.status(500).send('Server Error');
        }
    }
};

const adminController = {
    users: async (req, res) => {
        try {
            const users = await User.getAll();
            res.render('admin/users', { users });
        } catch (error) {
            res.status(500).send('Server Error');
        }
    },

    updateRole: async (req, res) => {
        try {
            const { userId, role } = req.body;
            const oldUser = await User.findById(userId);
            const updated = await User.updateRole(userId, role);
            await auditLog(req, 'UPDATE_USER_ROLE', 'user', userId, oldUser, updated);
            res.redirect('/admin/users');
        } catch (error) {
            res.status(500).send('Server Error');
        }
    },

    allApplications: async (req, res) => {
        try {
            const applications = await Application.getAll();
            res.render('admin/applications', { applications });
        } catch (error) {
            res.status(500).send('Server Error');
        }
    }
};

const auditController = {
    logs: async (req, res) => {
        try {
            const logs = await Audit.getAll(200);
            res.render('audit/logs', { logs });
        } catch (error) {
            res.status(500).send('Server Error');
        }
    }
};

module.exports = { authController, applicationController, adminController, auditController };
const express = require('express');
const router = express.Router();
const { authController, applicationController, adminController, auditController } = require('../controllers/mainController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.render('index');
});

router.get('/auth/login', authController.showLogin);
router.post('/auth/login', authController.login);
router.get('/auth/register', authController.showRegister);
router.post('/auth/register', authController.register);
router.get('/auth/logout', authController.logout);

router.use(authMiddleware);

router.get('/dashboard', applicationController.dashboard);
router.get('/applications', applicationController.list);
router.get('/applications/add', applicationController.showAddForm);
router.post('/applications', applicationController.create);
router.get('/applications/:id', applicationController.view);
router.get('/applications/:id/edit', applicationController.showEditForm);
router.post('/applications/:id/update', applicationController.update);
router.post('/applications/:id/delete', applicationController.delete);

router.get('/admin/users', roleMiddleware('admin'), adminController.users);
router.post('/admin/users/role', roleMiddleware('admin'), adminController.updateRole);
router.get('/admin/applications', roleMiddleware('admin', 'advisor'), adminController.allApplications);

router.get('/audit-logs', roleMiddleware('admin'), auditController.logs);

module.exports = router;
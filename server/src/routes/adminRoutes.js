const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const controller = require('../controllers/adminArchiveController');
const userController = require('../controllers/adminUserController');
const activityController = require('../controllers/adminActivityController');

const router = express.Router();
router.use(auth, authorize('admin'));
router.get('/users', userController.list);
router.get('/users/:userId', userController.getOne);
router.patch('/users/:userId/role', userController.changeRole);
router.get('/overview', activityController.overview);
router.get('/activity', activityController.list);
router.get('/archives', controller.list);
router.post('/archives/:entityType/:id/restore', controller.restore);
router.delete('/archives/:entityType/:id', controller.permanentlyDelete);

module.exports = router;

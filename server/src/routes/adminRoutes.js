const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const controller = require('../controllers/adminArchiveController');

const router = express.Router();
router.use(auth, authorize('admin'));
router.get('/archives', controller.list);
router.post('/archives/:entityType/:id/restore', controller.restore);
router.delete('/archives/:entityType/:id', controller.permanentlyDelete);

module.exports = router;

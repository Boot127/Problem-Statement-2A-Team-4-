// Shared — admin/compliance view of the audit trail (Section 14.6)
const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const controller = require('../controllers/auditController');

const router = express.Router();

router.get('/', auth, authorize('compliance', 'admin'), controller.list);

module.exports = router;

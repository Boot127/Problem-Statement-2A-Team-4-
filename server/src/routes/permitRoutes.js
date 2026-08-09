const express = require('express');
const permitController = require('../controllers/permitController');

const router = express.Router();

// Dev 2 — work_permits CRUD (Section 14.3). Steps/documents are out of
// scope for this basic CRUD pass.
router.get('/', permitController.list);
router.get('/:id', permitController.getById);
router.post('/', permitController.create);
router.put('/:id', permitController.update);
router.patch('/:id/archive', permitController.archive);

module.exports = router;

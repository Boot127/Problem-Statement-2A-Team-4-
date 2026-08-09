// Dev 4 — newsletters + detected_updates CRUD + linking (Section 14.5).
// Reads: any authenticated role. Writes/upload/AI/review: Compliance only
// (mirrors recordRoutes.js — legal-update triage feeds the same
// compliance_records the Compliance role owns).

const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const { upload } = require('../middleware/newsletterUpload');
const controller = require('../controllers/newsletterController');

const router = express.Router();

router.use(auth);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', authorize('compliance', 'admin'), controller.create);
router.put('/:id', authorize('compliance', 'admin'), controller.update);
router.delete('/:id', authorize('compliance', 'admin'), controller.remove);
router.post('/:id/upload', authorize('compliance', 'admin'), upload.single('file'), controller.uploadFile);
router.post('/:id/summarize', authorize('compliance', 'admin'), controller.summarize);
router.post('/:id/review', authorize('compliance', 'admin'), controller.review);

module.exports = router;

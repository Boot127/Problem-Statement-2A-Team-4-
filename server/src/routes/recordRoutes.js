// Dev 1 — compliance_records CRUD + components + attachments + ai-assist
// (Section 14.2). Reads: any authenticated role. Writes: Compliance only.

const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const visibility = require('../middleware/visibility');
const validate = require('../middleware/validate');
const { upload } = require('../middleware/upload');
const { RECORD_CATEGORIES, WORKER_TYPES, VISIBILITY_LEVELS } = require('../utils/enums');
const controller = require('../controllers/recordController');

const router = express.Router();

const recordSchema = {
  countryCode: { required: true, type: 'string', pattern: /^[A-Z]{2}$/ },
  category: { required: true, type: 'string', enum: RECORD_CATEGORIES },
  title: { required: true, type: 'string', maxLength: 200 },
  summary: { type: 'string', maxLength: 500 },
  workerType: { type: 'string', enum: WORKER_TYPES },
  visibility: { type: 'string', enum: VISIBILITY_LEVELS },
};

router.use(auth);

router.get('/', visibility, controller.list);
router.get('/:id', visibility, controller.getById);
router.post('/', authorize('compliance'), validate(recordSchema), controller.create);
router.put('/:id', authorize('compliance'), validate(recordSchema), controller.update);
router.patch('/:id/archive', authorize('compliance'), controller.archive);
router.post('/:id/components', authorize('compliance'), controller.addComponent);
router.post('/:id/attachments', authorize('compliance'), upload.single('file'), controller.addAttachment);
router.post('/:id/ai-assist', authorize('compliance'), controller.aiAssist);

module.exports = router;

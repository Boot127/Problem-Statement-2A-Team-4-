const express = require('express');
const permitController = require('../controllers/permitController');
const permitStepController = require('../controllers/permitStepController');
const permitDocumentController = require('../controllers/permitDocumentController');
const permitSourceDocumentController = require('../controllers/permitSourceDocumentController');
const permitExtractionController = require('../controllers/permitExtractionController');
const permitChangeDetectionController = require('../controllers/permitChangeDetectionController');
const permitQuestionAnswerController = require('../controllers/permitQuestionAnswerController');
const permitEligibilityController = require('../controllers/permitEligibilityController');
const permitGroupController = require('../controllers/permitGroupController');
const permitProcessCopyController = require('../controllers/permitProcessCopyController');
const permitGuideController = require('../controllers/permitGuideController');

const router = express.Router();

// Dev 2 — work_permits CRUD (Section 14.3).
router.get('/', permitController.list);
// Literal collection paths MUST be declared before '/:id', or Express captures
// them as an id and getById rejects them as non-numeric.
router.get('/health-summary', permitController.healthSummary);
router.get('/reminders', permitController.reminders);
router.get('/duplicates', permitController.duplicates);
router.get('/groups', permitGroupController.list);
router.post('/groups', permitGroupController.create);
router.get('/groups/:groupId', permitGroupController.getById);
router.put('/groups/:groupId', permitGroupController.update);
router.patch('/groups/:groupId/archive', permitGroupController.archive);
router.patch('/groups/:groupId/restore', permitGroupController.restore);
router.post('/groups/:groupId/members', permitGroupController.addMember);
router.delete('/groups/:groupId/members/:permitId', permitGroupController.removeMember);
router.get('/:id/groups', permitGroupController.forPermit);
router.get('/:id', permitController.getById);
router.post('/', permitController.create);
router.put('/:id', permitController.update);
router.patch('/:id/archive', permitController.archive);
// Information health — records a review without round-tripping the whole permit.
router.patch('/:id/review', permitController.recordReview);
router.post('/:id/process-copy', permitProcessCopyController.copy);
router.get('/:id/guide.docx', permitGuideController.downloadDocx);
router.post('/:id/ask', permitQuestionAnswerController.ask);
router.post('/:id/check-eligibility', permitEligibilityController.check);

// Dev 2 — ordered process steps, grouped by process_type (FR-2.3 / FR-2.5).
// `/steps/reorder` is declared before `/steps/:stepId` so the literal path is
// never captured as a step id.
router.get('/:id/steps', permitStepController.list);
router.post('/:id/steps', permitStepController.create);
router.patch('/:id/steps/reorder', permitStepController.reorder);
router.get('/:id/steps/:stepId', permitStepController.getById);
router.put('/:id/steps/:stepId', permitStepController.update);
router.delete('/:id/steps/:stepId', permitStepController.remove);

// Dev 2 — required-document checklist, grouped by process_type (FR-2.4).
// `/documents/reorder` is declared before `/documents/:documentId` for the
// same reason as the steps routes above.
router.get('/:id/documents', permitDocumentController.list);
router.post('/:id/documents', permitDocumentController.create);
router.patch('/:id/documents/reorder', permitDocumentController.reorder);
router.get('/:id/documents/:documentId', permitDocumentController.getById);
router.put('/:id/documents/:documentId', permitDocumentController.update);
router.delete('/:id/documents/:documentId', permitDocumentController.remove);

// Dev 2 — uploaded source documents (PDF/DOCX evidence for a permit).
// `handleUpload` runs multer and converts its errors into 400s before the
// controller sees the request.
router.get('/:id/source-documents', permitSourceDocumentController.list);
router.post(
  '/:id/source-documents',
  permitSourceDocumentController.handleUpload,
  permitSourceDocumentController.create
);
router.get('/:id/source-documents/:documentId', permitSourceDocumentController.getById);
router.get('/:id/source-documents/:documentId/download', permitSourceDocumentController.download);
router.post('/:id/source-documents/:documentId/extract', permitExtractionController.extract);
router.post('/:id/source-documents/:documentId/extraction-draft', permitExtractionController.apply);
router.post('/:id/source-documents/:documentId/compare', permitChangeDetectionController.compare);
router.post('/:id/source-documents/:documentId/change-draft', permitChangeDetectionController.apply);
router.put('/:id/source-documents/:documentId', permitSourceDocumentController.update);
router.put(
  '/:id/source-documents/:documentId/file',
  permitSourceDocumentController.handleUpload,
  permitSourceDocumentController.replace
);
router.patch('/:id/source-documents/:documentId/archive', permitSourceDocumentController.archive);
router.patch('/:id/source-documents/:documentId/restore', permitSourceDocumentController.restore);
router.delete('/:id/source-documents/:documentId', permitSourceDocumentController.remove);

module.exports = router;

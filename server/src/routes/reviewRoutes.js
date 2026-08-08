const express = require('express');
const reviewController = require('../controllers/reviewController');

const router = express.Router();

// Dev 3 — review_requests CRUD (Section 14.4). Transitions, publish,
// comments, and notifications are out of scope for this basic CRUD pass.
router.get('/', reviewController.list);
router.get('/targets/options', reviewController.targets);
router.get('/:id', reviewController.getById);
router.post('/', reviewController.create);
router.put('/:id', reviewController.update);
router.patch('/:id/transition', reviewController.transition);
router.post('/:id/comments', reviewController.comment);
router.post('/:id/publish', reviewController.publish);

module.exports = router;

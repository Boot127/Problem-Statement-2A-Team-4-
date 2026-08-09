const express = require('express');
const reviewController = require('../controllers/reviewController');

const router = express.Router();

// Dev 3 — complete review workflow, publishing, comments, versions, and notifications.
router.get('/', reviewController.list);
router.get('/targets/options', reviewController.targets);
router.get('/notifications', reviewController.notifications);
router.patch('/notifications/read-all', reviewController.markAllNotificationsRead);
router.patch('/notifications/:notificationId/read', reviewController.markNotificationRead);
router.get('/:id', reviewController.getById);
router.post('/', reviewController.create);
router.put('/:id', reviewController.update);
router.patch('/:id/transition', reviewController.transition);
router.post('/:id/comments', reviewController.comment);
router.post('/:id/publish', reviewController.publish);

module.exports = router;

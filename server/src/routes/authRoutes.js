const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const controller = require('../controllers/authController');

const router = express.Router();

router.post(
  '/login',
  validate({
    email: { required: true, type: 'string' },
    password: { required: true, type: 'string' },
  }),
  controller.login
);
router.post('/logout', auth, controller.logout);
router.get('/me', auth, controller.me);

module.exports = router;

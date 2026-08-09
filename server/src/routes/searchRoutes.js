// Shared — cross-entity keyword search + filters (Section 14.6)
const express = require('express');
const auth = require('../middleware/auth');
const visibility = require('../middleware/visibility');
const controller = require('../controllers/searchController');

const router = express.Router();

router.get('/', auth, visibility, controller.search);

module.exports = router;

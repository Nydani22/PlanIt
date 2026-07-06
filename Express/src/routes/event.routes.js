const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const authenticateToken = require('../middleware/authenticateToken');

router.post('/create', authenticateToken, eventController.createEvent);
router.get('/', authenticateToken, eventController.getUserEvents);

module.exports = router;
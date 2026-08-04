const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const authenticateToken = require('../middleware/authenticateToken');

router.post('/create', authenticateToken, eventController.createEvent);
router.get('/', authenticateToken, eventController.getUserEvents);
router.post('/find-time', authenticateToken, eventController.getEventsForTimeSearch);
router.get('/feed/:token', eventController.generateICalFeed);
router.get('/:id', authenticateToken, eventController.findOne);
router.put('/:id', authenticateToken, eventController.update);
router.delete('/:id', authenticateToken, eventController.delete);
router.patch('/:id/status', authenticateToken, eventController.updateStatus);
router.patch('/:id/cancel-instance', authenticateToken, eventController.cancelInstance);
module.exports = router;
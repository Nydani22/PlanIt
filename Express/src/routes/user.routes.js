const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/authenticateToken');

router.use(authMiddleware);

router.get('/me', userController.getCurrentUser);
router.post('/regenerate-feed-token', userController.regenerateFeedToken);
router.get('/:id', userController.findOne);
router.put('/:id', userController.update);
router.delete('/:id', userController.delete);

module.exports = router;
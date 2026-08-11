const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const multer = require('multer');
const authMiddleware = require('../middleware/authenticateToken');
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

router.post('/chat', upload.single('image'), aiController.handleAIChat);

module.exports = router;
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const authMiddleware = require('../middleware/authenticateToken');

router.use(authMiddleware);

router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getOne);
router.post('/', categoryController.create);
router.put('/:id', categoryController.update);
router.delete('/:id', categoryController.remove);

module.exports = router;
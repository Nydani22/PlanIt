const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

router.get('/:id', userController.findOne);
router.put('/:id', userController.update);
router.delete('/:id', userController.delete);

module.exports = router;
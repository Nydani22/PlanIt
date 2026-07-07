const express = require('express');
const router = express.Router();
const groupController = require('../controllers/group.controller');
const authenticateToken = require('../middleware/authenticateToken');

router.get('/', authenticateToken, groupController.getUserGroups);
router.post('/create', authenticateToken, groupController.createGroup);
router.get('/:id', authenticateToken, groupController.getGroupById);
router.put('/:id', authenticateToken, groupController.updateGroup);
router.delete('/:id', authenticateToken, groupController.deleteGroup);
router.post('/:id/members', authenticateToken, groupController.addMember);

module.exports = router;
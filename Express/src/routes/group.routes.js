const express = require('express');
const router = express.Router();
const groupController = require('../controllers/group.controller');
const authenticateToken = require('../middleware/authenticateToken');

router.get('/', authenticateToken, groupController.getUserGroups);
router.post('/create', authenticateToken, groupController.createGroup);

//router.post('/:id/join', authenticateToken, groupController.joinGroup);
router.patch('/:id/members/:memberId/role', authenticateToken, groupController.updateMemberRole);
router.delete('/:id/members/:memberId', authenticateToken, groupController.removeMember);
//router.get('/:id/info', groupController.getPublicGroupInfo);

router.post('/:id/invites', authenticateToken, groupController.generateInvite);
router.get('/invites/:token', groupController.getInviteInfo);
router.post('/invites/:token/join', authenticateToken, groupController.joinWithInvite);

router.get('/:id', authenticateToken, groupController.getGroupById);
router.put('/:id', authenticateToken, groupController.updateGroup);
router.delete('/:id', authenticateToken, groupController.deleteGroup);

module.exports = router;
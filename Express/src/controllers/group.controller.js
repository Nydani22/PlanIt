const groupService = require('../services/group.service');
const Group = require('../models/Group.model'); // ÚJ IMPORT a kontrolleres ellenőrzésekhez

exports.createGroup = async (req, res) => {
    try {
        const userId = req.user.id;
        const group = await groupService.createGroup(req.body, userId);
        res.status(201).json(group);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getUserGroups = async (req, res) => {
    try {
        const userId = req.user.id;
        const groups = await groupService.getUserGroups(userId);
        res.status(200).json(groups);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getGroupById = async (req, res) => {
    try {
        const group = await groupService.getGroupById(req.params.id, req.user.id);

        if (!group) {
            return res.status(403).json({ message: 'Nincs jogosultságod a csoport adatainak lekéréséhez, vagy a csoport nem létezik.' });
        }
        
        res.status(200).json(group);
    } catch (error) {
        res.status(500).json({ message: 'Hiba történt.' });
    }
};

exports.updateGroup = async (req, res) => {
    try {
        const userId = req.user.id;
        const groupId = req.params.id;
        
        const updatedGroup = await groupService.updateGroup(groupId, userId, req.body);
        
        if (!updatedGroup) {
            return res.status(403).json({ message: 'Nincs jogosultságod a módosításhoz (nem vagy ADMIN), vagy a csoport nem létezik.' });
        }
        res.status(200).json(updatedGroup);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteGroup = async (req, res) => {
    try {
        const userId = req.user.id;
        const groupId = req.params.id;
        
        const deletedGroup = await groupService.deleteGroup(groupId, userId);
        
        if (!deletedGroup) {
            return res.status(403).json({ message: 'Nincs jogosultságod a törléshez, vagy a csoport nem létezik.' });
        }
        res.status(200).json({ message: 'Csoport sikeresen törölve.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.generateInvite = async (req, res) => {
    try {
        const userId = req.user.id;
        const groupId = req.params.id;

        const group = await Group.findOne({ 
            _id: groupId, 
            members: { $elemMatch: { userId: userId, role: { $in: ['OWNER', 'ADMIN'] } } } 
        });

        if (!group) {
            return res.status(403).json({ message: 'Nincs jogosultságod meghívót generálni ehhez a csoporthoz!' });
        }

        const token = await groupService.generateInvite(groupId, userId);
        res.status(201).json({ token });
    } catch (error) {
        res.status(403).json({ message: error.message });
    }
};

exports.getInviteInfo = async (req, res) => {
    try {
        const groupInfo = await groupService.getInviteInfo(req.params.token);
        res.status(200).json(groupInfo);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

exports.joinWithInvite = async (req, res) => {
    try {
        const group = await groupService.joinWithInvite(req.params.token, req.user.id);
        res.status(200).json({ message: 'Sikeres csatlakozás!', group });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateMemberRole = async (req, res) => {
    try {
        const adminId = req.user.id;
        const groupId = req.params.id;
        const memberId = req.params.memberId;
        const { role } = req.body;

        if (!role || !['ADMIN', 'MEMBER'].includes(role)) {
            return res.status(400).json({ message: 'Érvénytelen jogosultság!' });
        }

        const updatedGroup = await groupService.updateMemberRole(groupId, adminId, memberId, role);
        res.status(200).json(updatedGroup);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.removeMember = async (req, res) => {
    try {
        const requesterId = req.user.id;
        const groupId = req.params.id;
        const memberId = req.params.memberId;

        const group = await Group.findOne({ 
            _id: groupId, 
            'members.userId': requesterId 
        });

        if (!group) {
            return res.status(403).json({ message: 'A csoport nem található, vagy nem vagy tagja!' });
        }

        const requester = group.members.find(m => m.userId.toString() === requesterId.toString());
        const targetMember = group.members.find(m => m.userId.toString() === memberId.toString());

        if (!targetMember) {
            return res.status(404).json({ message: 'A célzott tag nem található a csoportban!' });
        }

        const isSelfLeave = requesterId.toString() === memberId.toString();

        if (!isSelfLeave) {
            if (!['OWNER', 'ADMIN'].includes(requester.role)) {
                return res.status(403).json({ message: 'Nincs jogosultságod más tagok eltávolításához!' });
            }
            if (targetMember.role === 'OWNER') {
                return res.status(403).json({ message: 'A csoport készítőjét nem lehet eltávolítani!' });
            }
            if (requester.role === 'ADMIN' && targetMember.role === 'ADMIN') {
                return res.status(403).json({ message: 'Admin nem távolíthat el egy másik Admint!' });
            }
        } else {
            if (requester.role === 'OWNER') {
                return res.status(403).json({ message: 'Tulajdonosként nem léphetsz ki!' });
            }
        }

        const updatedGroup = await groupService.removeMember(groupId, requesterId, memberId, isSelfLeave);
        res.status(200).json(updatedGroup);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
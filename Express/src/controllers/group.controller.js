const groupService = require('../services/group.service');

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
        let group;
        
        if (req.user && req.user.id) {
            group = await groupService.getGroupById(req.params.id, req.user.id);
        }

        if (!group) {
            group = await groupService.getGroupByIdPublic(req.params.id);
        }

        if (!group) return res.status(404).json({ message: 'A csoport már nem létezik.' });
        
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
        const token = await groupService.generateInvite(req.params.id, req.user.id);
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
        const adminId = req.user.id;
        const groupId = req.params.id;
        const memberId = req.params.memberId;

        const updatedGroup = await groupService.removeMember(groupId, adminId, memberId);
        res.status(200).json(updatedGroup);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
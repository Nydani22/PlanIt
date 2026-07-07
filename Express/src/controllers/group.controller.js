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
        const userId = req.user.id;
        const groupId = req.params.id;
        const group = await groupService.getGroupById(groupId, userId);
        
        if (!group) {
            return res.status(404).json({ message: 'Csoport nem található, vagy nem vagy a tagja.' });
        }
        res.status(200).json(group);
    } catch (error) {
        res.status(500).json({ message: error.message });
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

exports.addMember = async (req, res) => {
    try {
        const adminUserId = req.user.id;
        const groupId = req.params.id;
        const { newMemberId, role } = req.body;

        if (!newMemberId) {
            return res.status(400).json({ message: 'A hozzáadni kívánt felhasználó ID-ja (newMemberId) kötelező!' });
        }

        const updatedGroup = await groupService.addMember(groupId, adminUserId, newMemberId, role);
        res.status(200).json(updatedGroup);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
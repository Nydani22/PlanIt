const Group = require('../models/group.model');

exports.createGroup = async (groupData, userId) => {
    const { groupName, description } = groupData;

    const newGroup = new Group({
        groupName,
        description,
        creatorId: userId,
        members: [{
            userId: userId,
            role: 'ADMIN'
        }]
    });

    return await newGroup.save();
};

exports.getUserGroups = async (userId) => {
    return await Group.find({ 'members.userId': userId })
                      .sort({ createdAt: -1 }); // Legújabbak elöl
};

exports.getGroupById = async (groupId, userId) => {
    return await Group.findOne({ 
        _id: groupId, 
        'members.userId': userId 
    });
};

exports.updateGroup = async (groupId, userId, updateData) => {
    return await Group.findOneAndUpdate(
        { 
            _id: groupId, 
            members: { $elemMatch: { userId: userId, role: 'ADMIN' } } 
        }, 
        updateData, 
        { new: true, runValidators: true }
    );
};

exports.deleteGroup = async (groupId, userId) => {
    return await Group.findOneAndDelete({ 
        _id: groupId, 
        members: { $elemMatch: { userId: userId, role: 'ADMIN' } } 
    });
};

exports.addMember = async (groupId, adminUserId, newMemberId, role = 'MEMBER') => {
    const group = await Group.findOne({ 
        _id: groupId, 
        members: { $elemMatch: { userId: adminUserId, role: 'ADMIN' } } 
    });

    if (!group) {
        throw new Error('Nem található a csoport, vagy nincs ADMIN jogosultságod!');
    }

    const isAlreadyMember = group.members.some(member => member.userId.toString() === newMemberId);
    if (isAlreadyMember) {
        throw new Error('Ez a felhasználó már tagja a csoportnak!');
    }

    group.members.push({ userId: newMemberId, role: role });
    return await group.save();
};
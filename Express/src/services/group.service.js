const Group = require('../models/group.model');
const notificationService = require('./notification.service');
const crypto = require('crypto');
const Invitation = require('../models/invitation.model');


exports.createGroup = async (groupData, userId) => {
    const { groupName, description } = groupData;

    const newGroup = new Group({
        groupName,
        description,
        creatorId: userId,
        members: [{
            userId: userId,
            role: 'OWNER'
        }]
    });

    await newGroup.save();
    return await newGroup.populate('members.userId', '_id userName fullName email');
};

exports.getUserGroups = async (userId) => {
    return await Group.find({ 'members.userId': userId })
        .sort({ createdAt: -1 })
        .populate('members.userId', '_id userName fullName email');
};

exports.getGroupById = async (groupId, userId) => {
    return await Group.findOne({ 
        _id: groupId, 
        'members.userId': userId 
    }).populate('members.userId', '_id userName fullName email');
};

exports.getGroupByIdPublic = async (groupId) => {
    return await Group.findById(groupId)
        .populate('members.userId', '_id userName fullName email');
};

exports.updateGroup = async (groupId, userId, updateData) => {
    return await Group.findOneAndUpdate(
        {
            _id: groupId,
            members: { $elemMatch: { userId: userId, role: 'OWNER' } } 
        }, 
        updateData, 
        { returnDocument: 'after', runValidators: true }
    ).populate('members.userId', '_id userName fullName email');
};

exports.deleteGroup = async (groupId, userId) => {
    return await Group.findOneAndDelete({ 
        _id: groupId, 
        members: { $elemMatch: { userId: userId, role: 'OWNER' } } 
    });
};



exports.generateInvite = async (groupId, userId) => {
    const group = await Group.findOne({ 
        _id: groupId, 
        members: { $elemMatch: { userId: userId, role: { $in: ['OWNER', 'ADMIN'] } } } 
    });

    if (!group) throw new Error('Nincs jogosultságod meghívót generálni ehhez a csoporthoz!');

    const token = crypto.randomBytes(20).toString('hex');
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const invitation = new Invitation({
        token,
        groupId,
        inviterId: userId,
        expiresAt
    });

    await invitation.save();
    return token;
};

exports.getInviteInfo = async (token) => {
    const invitation = await Invitation.findOne({ token }).populate('groupId', 'groupName description');
    
    if (!invitation || !invitation.groupId) {
        throw new Error('A meghívó érvénytelen, lejárt, vagy már felhasználták.');
    }

    return invitation.groupId;
};


exports.joinWithInvite = async (token, userId) => {
    const invitation = await Invitation.findOne({ token });
    if (!invitation) {
        throw new Error('A meghívó érvénytelen vagy már felhasználták!');
    }

    const group = await Group.findById(invitation.groupId);
    if (!group) {
        throw new Error('A csoport már nem létezik!');
    }

    const isAlreadyMember = group.members.some(member => member.userId.toString() === userId.toString());
    if (isAlreadyMember) {
        await Invitation.deleteOne({ _id: invitation._id });
        throw new Error('Már tagja vagy ennek a csoportnak!');
    }

    group.members.push({ userId: userId, role: 'MEMBER' });
    await group.save();

    //await Invitation.deleteOne({ _id: invitation._id }); 
    
    await group.populate('members.userId', '_id userName fullName email');

    const joinedMember = group.members.find(m => m.userId._id.toString() === userId.toString());
    const newMemberName = joinedMember.userId.fullName || joinedMember.userId.userName || 'Egy új tag';

    const adminsAndOwner = group.members.filter(m => m.role === 'ADMIN' || m.role === 'OWNER');
    for (const admin of adminsAndOwner) {
        if (admin.userId._id.toString() !== userId.toString()) {
            await notificationService.createNotification({
                recipientId: admin.userId._id,
                senderId: userId,
                groupId: group._id,
                type: 'SYSTEM',
                message: `${newMemberName} csatlakozott a csoportodhoz: ${group.groupName}`
            });
        }
    }

    await notificationService.createNotification({
        recipientId: userId,
        groupId: group._id,
        type: 'SYSTEM',
        message: `Sikeresen csatlakoztál a csoporthoz: ${group.groupName}`
    });

    return group;
};


exports.updateMemberRole = async (groupId, requesterId, targetMemberId, newRole) => {
    const group = await Group.findOne({ 
        _id: groupId, 
        members: { $elemMatch: { userId: requesterId, role: 'OWNER' } } 
    });

    if (!group) throw new Error('Csak a csoport tulajdonosa módosíthatja a jogosultságokat!');

    const targetMember = group.members.find(m => m.userId.toString() === targetMemberId.toString());
    if (!targetMember) throw new Error('A felhasználó nem tagja a csoportnak!');

    if (newRole === 'OWNER') {
        throw new Error('Az OWNER jogosultságot nem lehet átadni!');
    }
    if (targetMember.role === 'OWNER') {
        throw new Error('A csoport tulajdonosának jogosultságát nem lehet módosítani!');
    }

    targetMember.role = newRole;
    await group.save();

    await notificationService.createNotification({
        recipientId: targetMemberId,
        senderId: requesterId,
        groupId: group._id,
        type: 'ROLE_CHANGE', 
        message: `Megváltozott a jogosultságod a(z) ${group.groupName} csoportban: ${newRole === 'ADMIN' ? 'Admin' : 'Tag'}`
    });

    return await group.populate('members.userId', '_id userName fullName email');
};

exports.removeMember = async (groupId, requesterId, targetMemberId) => {
    const group = await Group.findOne({ 
        _id: groupId, 
        'members.userId': requesterId 
    });

    if (!group) throw new Error('A csoport nem található, vagy nem vagy tagja!');

    const requester = group.members.find(m => m.userId.toString() === requesterId.toString());
    const targetMember = group.members.find(m => m.userId.toString() === targetMemberId.toString());

    if (!targetMember) throw new Error('A célzott tag nem található a csoportban!');

    const isSelfLeave = requesterId.toString() === targetMemberId.toString();

    if (!isSelfLeave) {
        if (!['OWNER', 'ADMIN'].includes(requester.role)) {
            throw new Error('Nincs jogosultságod más tagok eltávolításához!');
        }
        if (targetMember.role === 'OWNER') {
            throw new Error('A csoport készítőjét nem lehet eltávolítani!');
        }
        if (requester.role === 'ADMIN' && targetMember.role === 'ADMIN') {
            throw new Error('Admin nem távolíthat el egy másik Admint!');
        }
    } else {
        if (requester.role === 'OWNER') {
            throw new Error('Tulajdonosként nem léphetsz ki!');
        }
    }

    group.members = group.members.filter(m => m.userId.toString() !== targetMemberId.toString());
    await group.save();

    if (isSelfLeave) {
        const adminsAndOwner = group.members.filter(m => m.role === 'ADMIN' || m.role === 'OWNER');
        
        for (const admin of adminsAndOwner) {
            await notificationService.createNotification({
                recipientId: admin.userId,
                senderId: requesterId,
                groupId: group._id,
                type: 'MEMBER_LEFT',
                message: `Egy tag kilépett a(z) ${group.groupName} csoportodból.`
            });
        }
    } else {
        await notificationService.createNotification({
            recipientId: targetMemberId,
            senderId: requesterId,
            groupId: null,
            type: 'MEMBER_REMOVED',
            message: `Eltávolítottak a(z) ${group.groupName} csoportból.`
        });
    }

    return await group.populate('members.userId', '_id userName fullName email');
};
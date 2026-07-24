const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; 
const FIXED_IV = process.env.FIXED_IV;

exports.encryptToken = (text) => {
    if (!text) return null;
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), Buffer.from(FIXED_IV));
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
};

exports.decryptToken = (encryptedText) => {
    if (!encryptedText) return null;
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), Buffer.from(FIXED_IV));
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const RefreshToken = require('../models/RefreshToken.model');
const crypto = require('crypto');
const emailService = require('../services/email.service');
const { encryptToken } = require('../utils/encryption.util');

const generateTokens = async (user) => {
    const accessToken = jwt.sign(
        { id: user._id },
        process.env.TOKEN_SECRET,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
    );

    await new RefreshToken({ userId: user._id, token: refreshToken }).save();

    return { accessToken, refreshToken };
};

exports.registerUser = async (userData) => {
    const { userName, fullName, email, password } = userData;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new Error('Ez az email cím már foglalt.');
    }

    const existingUserName = await User.findOne({userName});
    if (existingUserName) {
        throw new Error('Ez az felhasználónév már foglalt.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const generatedToken = crypto.randomBytes(24).toString('hex');
    
    const encryptedToken = encryptToken(generatedToken);

    const newUser = new User({
        userName,
        fullName,
        email,
        password: hashedPassword,
        calendarFeedToken: encryptedToken
    });

    await newUser.save();
    
    emailService.sendWelcomeEmail(email, fullName).catch(err => {
        console.error('Hiba az üdvözlő email küldésekor:', err);
    });
    
    const tokens = await generateTokens(newUser);
    
    const userResponse = newUser.toObject();
    userResponse.calendarFeedToken = generatedToken; 
    
    return {
        user: userResponse,
        ...tokens
    };
};

exports.loginUser = async (email, password) => {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new Error('Hibás email vagy jelszó');
    }

    return await generateTokens(user);
};

exports.resetPasswordWithToken = async (token, newPassword) => {
    const user = await User.findOne({ 
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() } 
    });

    if (!user) {
        throw new Error('A jelszóvisszaállító link érvénytelen vagy lejárt.');
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
};

exports.requestPasswordReset = async (email) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('Nincs regisztrálva fiók ezzel az e-mail címmel.');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; 
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
      await emailService.sendPasswordResetEmail(user.email, user.fullName, resetUrl);
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      console.error('Hiba az e-mail küldésekor:', error);
      throw new Error('Nem sikerült elküldeni a visszaállító e-mailt.');
    }
};

exports.refreshTokens = async (oldRefreshToken) => {
    const savedToken = await RefreshToken.findOne({ token: oldRefreshToken });
    
    if (!savedToken) {
        console.error('[AUTH SERVICE Hiba] A token nem található az adatbázisban! Lehetséges ok: egy párhuzamos hálózati kérés (race condition) már beváltotta és törölte ezt a tokent.');
        throw new Error('Érvénytelen vagy már felhasznált token');
    }

    return new Promise((resolve, reject) => {
        jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
            if (err) {
                console.error(`[AUTH SERVICE Hiba] JWT Verifikáció elhasalt: ${err.message}`);
                await RefreshToken.deleteOne({ token: oldRefreshToken });
                return reject(new Error('Lejárt/Hibás token'));
            }

            const user = await User.findById(decoded.id);
            if (!user) {
                console.error('[AUTH SERVICE Hiba] A dekódolt tokenhez nem tartozik felhasználó az adatbázisban.');
                return reject(new Error('Felhasználó nem található'));
            }

            await RefreshToken.deleteOne({ token: oldRefreshToken });
            const tokens = await generateTokens(user);
            resolve(tokens);
        });
    });
};

exports.logoutUser = async (refreshToken) => {
    await RefreshToken.findOneAndDelete({ token: refreshToken });
};
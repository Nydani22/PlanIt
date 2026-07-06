const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const RefreshToken = require('../models/RefreshToken.model');

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

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
        userName,
        fullName,
        email,
        password: hashedPassword
    });

    await newUser.save();
    return newUser;
};

exports.loginUser = async (email, password) => {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new Error('Hibás email vagy jelszó');
    }

    return await generateTokens(user);
};

exports.refreshTokens = async (oldRefreshToken) => {
    const savedToken = await RefreshToken.findOne({ token: oldRefreshToken });
    if (!savedToken) {
        throw new Error('Érvénytelen vagy már felhasznált token');
    }

    return new Promise((resolve, reject) => {
        jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
            if (err) {
                await RefreshToken.deleteOne({ token: oldRefreshToken });
                return reject(new Error('Lejárt/Hibás token'));
            }

            const user = await User.findById(decoded.id);
            if (!user) return reject(new Error('Felhasználó nem található'));

            await RefreshToken.deleteOne({ token: oldRefreshToken });
            const tokens = await generateTokens(user);
            resolve(tokens);
        });
    });
};

exports.logoutUser = async (refreshToken) => {
    await RefreshToken.findOneAndDelete({ token: refreshToken });
};
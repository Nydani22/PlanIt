const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User.model');
const RefreshToken = require('../models/RefreshToken.model');

router.post('/register', async (req, res) => {
    try {
        const { userName, fullName, email, password, role } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Ez az email cím már foglalt.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            userName,
            fullName,
            email,
            password: hashedPassword,
            role
        });

        await newUser.save();
        res.status(201).json({ message: 'Sikeres regisztráció!' });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


const generateTokens = async (user) => {
    const accessToken = jwt.sign(
        { id: user._id, role: user.role },
        process.env.TOKEN_SECRET,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '1d' }
    );

    await new RefreshToken({ userId: user._id, token: refreshToken }).save();

    return { accessToken, refreshToken };
};


router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Hibás email vagy jelszó' });
        }

        const { accessToken, refreshToken } = await generateTokens(user);

        const ONE_DAY=24 * 60 * 60 * 1000;
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: ONE_DAY 
        });

        res.json({ accessToken });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


router.post('/refresh', async (req, res) => {
    const oldRefreshToken = req.cookies.refreshToken;
    if (!oldRefreshToken) return res.status(401).json({ message: 'Nincs refresh token' });

    try {
        const savedToken = await RefreshToken.findOne({ token: oldRefreshToken });
        if (!savedToken) return res.status(403).json({ message: 'Érvénytelen vagy már felhasznált token' });

        jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
            if (err) {
                // Ha lejárt a JWT, töröljük a DB-ből is a biztonság kedvéért
                await RefreshToken.deleteOne({ token: oldRefreshToken });
                return res.status(403).json({ message: 'Lejárt/Hibás token' });
            }

            const user = await User.findById(decoded.id);
            if (!user) return res.status(404).json({ message: 'Felhasználó nem található' });

            
            const accessToken = jwt.sign(
                { id: user._id, role: user.role },
                process.env.TOKEN_SECRET,
                { expiresIn: '15m' }
            );

            
            const newRefreshToken = jwt.sign(
                { id: user._id },
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: '1d' }
            );

            await RefreshToken.deleteOne({ token: oldRefreshToken });
            const newTokenEntry = new RefreshToken({ token: newRefreshToken, userId: user._id });
            await newTokenEntry.save();
            const ONE_DAY=24 * 60 * 60 * 1000;
            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: ONE_DAY
            });

            res.json({ accessToken });
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


router.post('/logout', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    await RefreshToken.findOneAndDelete({ token: refreshToken });
    res.clearCookie('refreshToken');
    res.json({ message: 'Sikeres kijelentkezés' });
});

module.exports = router;
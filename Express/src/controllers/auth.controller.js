const authService = require('../services/auth.service');

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

exports.register = async (req, res) => {
    try {
        await authService.registerUser(req.body);
        res.status(201).json({ message: 'Sikeres regisztráció!' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const { accessToken, refreshToken } = await authService.loginUser(email, password);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', 
            sameSite: 'none',
            maxAge: ONE_WEEK
        });

        res.json({ accessToken });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.refresh = async (req, res) => {
    const oldRefreshToken = req.cookies.refreshToken;
    if (!oldRefreshToken) return res.status(401).json({ message: 'Nincs refresh token' });

    try {
        const { accessToken, refreshToken: newRefreshToken } = await authService.refreshTokens(oldRefreshToken);

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', 
            sameSite: 'none',
            maxAge: ONE_WEEK
        });

        res.json({ accessToken });
    } catch (err) {
        res.status(403).json({ message: err.message });
    }
};

exports.logout = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
        await authService.logoutUser(refreshToken);
    }
    res.clearCookie('refreshToken');
    res.json({ message: 'Sikeres kijelentkezés' });
};
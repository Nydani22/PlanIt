const authService = require('../services/auth.service');
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

exports.register = async (req, res) => {
    try {
        const { user, accessToken, refreshToken } = await authService.registerUser(req.body);

        const isProduction = process.env.NODE_ENV === 'production';

        const cookieOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'Lax',
            maxAge: ONE_WEEK
        };

        if (isProduction) {
            cookieOptions.domain = '.useplanit.hu';
        }

        res.cookie('refreshToken', refreshToken, cookieOptions);

        res.status(201).json({ 
            message: 'Sikeres regisztráció!',
            accessToken: accessToken,
            user: user
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const { accessToken, refreshToken } = await authService.loginUser(email, password);
        const isProduction = process.env.NODE_ENV === 'production';

        const cookieOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'Lax',
            maxAge: ONE_WEEK
        };

        if (isProduction) {
            cookieOptions.domain = '.useplanit.hu';
        }

        res.cookie('refreshToken', refreshToken, cookieOptions);

        res.json({ accessToken });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.refresh = async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] [REFRESH START] Új token frissítési kérelem érkezett.`);
    
    const oldRefreshToken = req.cookies.refreshToken;
    const isProduction = process.env.NODE_ENV === 'production';
    
    const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'Lax'
    };

    if (isProduction) {
        cookieOptions.domain = '.useplanit.hu';
    }

    if (!oldRefreshToken) {
        console.error(`[${timestamp}] [REFRESH ERROR] Nincs refresh token a cookie-ban. (Okok: a böngésző eldobta a SameSite/Secure beállítás miatt, a frontend nem küldött 'withCredentials: true'-t, vagy lejárt a cookie.)`);
        res.clearCookie('refreshToken', cookieOptions);
        return res.status(401).json({ message: 'Nincs refresh token' });
    }

    try {
        console.log(`[${timestamp}] [REFRESH PROCESSING] Token jelen van a cookie-ban, adatbázis ellenőrzés indul...`);
        const { accessToken, refreshToken: newRefreshToken } = await authService.refreshTokens(oldRefreshToken);

        res.cookie('refreshToken', newRefreshToken, {
            ...cookieOptions,
            maxAge: ONE_WEEK
        });

        console.log(`[${timestamp}] [REFRESH SUCCESS] Sikeres token forgatás.`);
        res.json({ accessToken });
    } catch (err) {
        console.error(`[${timestamp}] [REFRESH FAILED] Hiba a frissítés során: ${err.message}`);
        res.clearCookie('refreshToken', cookieOptions);
        res.status(403).json({ message: err.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'E-mail cím megadása kötelező!' });
        }
        
        await authService.requestPasswordReset(email);
        
        res.status(200).json({ message: 'Visszaállítási link elküldve.' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};


exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'A token és az új jelszó megadása kötelező!' });
        }
        await authService.resetPasswordWithToken(token, newPassword);
        res.status(200).json({ message: 'Jelszó sikeresen megváltoztatva.' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.logout = async (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'Lax'
    };

    if (isProduction) {
        cookieOptions.domain = '.useplanit.hu';
    }

    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            await authService.logoutUser(refreshToken);
        }
        
        res.clearCookie('refreshToken', cookieOptions);
        res.json({ message: 'Sikeres kijelentkezés' });
    } catch (err) {
        console.error('Hiba a kijelentkezés során:', err);
        res.clearCookie('refreshToken', cookieOptions);
        res.status(500).json({ message: 'Részleges kijelentkezés történt.' });
    }
};
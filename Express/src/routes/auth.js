const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User.model');


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

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Hibás email vagy jelszó' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Hibás email vagy jelszó' });
        }
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            process.env.TOKEN_SECRET, 
            { expiresIn: '1d' }
        );

        res.json({ token: token });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
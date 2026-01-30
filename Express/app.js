require('dotenv').config();
const express = require('express');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/auth'); 
const eventRoutes = require('./src/routes/events');
const cors = require('cors');

const app = express();

connectDB();


app.use(cors());
app.use(express.json());


app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`A szerver fut a ${PORT}-es porton!`);
});

module.exports = app;
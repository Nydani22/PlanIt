const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Csatlakozva az adatbázishoz.');
  } catch (err) {
    console.error('Nem sikerült csatlakozni', err);
    process.exit(1);
  }
};

module.exports = connectDB;

const mongoose = require('mongoose');

const StatusSchema = new mongoose.Schema({
  statusName: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Status', StatusSchema);

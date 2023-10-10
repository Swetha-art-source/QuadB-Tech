const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
  user_id: {
    type: String,
    default: uuidv4,
    unique: true,
  },
  user_name: String,
  user_email: {
    type: String,
    unique: true,
  },
  user_password: String,
  user_image: String,
  total_orders: Number,
  created_at: {
    type: Date,
    default: Date.now,
  },
  last_logged_in: Date,
});

module.exports = mongoose.model('User', userSchema);

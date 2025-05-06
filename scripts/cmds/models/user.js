const mongoose = require("mongoose");
const { Schema } = mongoose;

// Define the User schema
const userSchema = new Schema({
  userID: String,
  bank: { type: Number, default: 0 },
  lastInterestClaimed: { type: Date, default: Date.now },
  loan: { type: Number, default: 0 },
  loanTakenAt: { type: Date, default: null },
  loanPayed: { type: Boolean, default: true }
});

// Define and export the User model
module.exports = mongoose.models.User || mongoose.model("User", userSchema);

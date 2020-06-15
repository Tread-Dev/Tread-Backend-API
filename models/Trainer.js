const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const TrainerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please add a first name'],
  },
  lastName: {
    type: String,
    required: [true, 'Please add a last name'],
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  role: {
    type: String,
    enum: ['trainer'],
    default: 'trainer',
  },
  trainerType: {
    type: String,
    required: [true, 'Please add a trainer type'],
  },
  numberOfClients: {
    type: String,
    required: [true, 'Please add number of clients'],
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

//Password encrypt middleware using bcrypt
TrainerSchema.pre('save', async function (next) {
  //Check if password is being updated
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

//Sign JWT and return
TrainerSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

//Match user entered password to hashed password in database
TrainerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

//Generate and Hash password reset toke
TrainerSchema.methods.getResetPasswordToken = function () {
  //Generate the token
  const resetToken = crypto.randomBytes(20).toString('hex');

  //Hash the token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  //Set resetPasswordExpire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  //Return not the hashed version
  return resetToken;
};

module.exports = mongoose.model('Trainer', TrainerSchema);

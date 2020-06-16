const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ClientSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please add a first name'],
  },
  lastName: {
    type: String,
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
    enum: ['client'],
    default: 'client',
  },
  clientType: {
    type: String,
    enum: ['online', 'offline', 'hybrid'],
    required: [true, 'Please add a client type'],
  },
  password: {
    type: String,
    // required: [true, 'Please add a password'],
    minlength: 6,
    select: false,
  },
  phone: {
    type: String,
    maxlength: [20, 'Phone number can not be longer than 20 characters'],
  },
  photo: {
    type: String,
    default: 'no-image.jpg',
  },
  fitnessGoal: {
    type: String,
  },
  trainer: {
    type: mongoose.Schema.ObjectId,
    ref: 'Trainer',
    required: true,
  },
  timeZone: {
    type: String,
  },
  height: {
    type: Number,
  },
  weight: {
    type: Number,
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'others'],
  },
  dob: {
    type: Date,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

//Password encrypt middleware using bcrypt
ClientSchema.pre('save', async function (next) {
  //Check if password is being updated
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  console.log(this.password);
  next();
});

//Sign JWT and return
ClientSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

//Match user entered password to hashed password in database
ClientSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

//Generate and Hash password reset toke
ClientSchema.methods.getResetPasswordToken = function () {
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

module.exports = mongoose.model('Client', ClientSchema);

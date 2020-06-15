const errorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Client = require('../models/Client');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// @desc     Register Trainer User
// @route    POST /api/v1/trainer/auth/register
// @access   Public
exports.register = asyncHandler(async (req, res, next) => {
  //Pull out user information from the body
  const {
    firstName,
    lastName,
    email,
    password,
    role,
    clientType,
    phone,
    fitnessGoal,
    trainer,
    timeZone,
    height,
    weight,
    gender,
    dob,
  } = req.body;

  //Create new user
  const client = await Client.create({
    firstName: firstName,
    lastName: lastName,
    email: email,
    password: password,
    role: role,
    clientType: clientType,
    phone: phone,
    fitnessGoal: fitnessGoal,
    trainer: trainer,
    timeZone: timeZone,
    height: height,
    weight: weight,
    gender: gender,
    dob: dob,
  });

  //Call sendTokenResponse to generate token and send it in a cookie
  sendTokenResponse(client, 200, res);
});

// @desc     Login Client User
// @route    POST /api/v1/client/auth/login
// @access   Public
exports.login = asyncHandler(async (req, res, next) => {
  //Pull out user information from the body
  const { email, password } = req.body;

  //Email & Password validation
  if (!email || !password) {
    return next(new errorResponse(`Please provide an email and password`, 400));
  }

  //Check for User
  const client = await Client.findOne({ email: email }).select('+password');

  if (!client) {
    return next(new errorResponse(`Invalid credentials`, 401));
  }

  //Check if password matches | *user not User*
  const isMatch = await client.matchPassword(password);

  if (!isMatch) {
    return next(new errorResponse(`Invalid credentials`, 401));
  }

  //Call sendTokenResponse to generate token and send it in a cookie
  sendTokenResponse(client, 200, res);
});

// @desc     Get Logged in User
// @route    POST /api/v1/auth/me
// @access   Private
exports.getMe = asyncHandler(async (req, res, next) => {
  //user id will come from auth middleware's response
  const client = await Client.findById(req.client.id);

  res.status(200).json({ success: true, data: client });
});

// @desc     Logout Client user / clear cookie
// @route    GET /api/v1/client/auth/logout
// @access   Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ success: true, data: {} });
});

// @desc     Update Client user details
// @route    POST /api/v1/client/auth/updatedetails
// @access   Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  //Take only the essential fields from req.body to update - Ignore password, role etc if at all passed
  const fieldsToUpdate = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    phone: req.body.phone,
    fitnessGoal: req.body.fitnessGoal,
    timeZone: req.body.timeZone,
    height: req.body.height,
    weight: req.body.weight,
  };

  //Client id will come from auth middleware's response
  const client = await Client.findByIdAndUpdate(req.client.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: client });
});

// @desc     Update password of Logged in Trainer User
// @route    PUT /api/v1/trainer/auth/updatepassword
// @access   Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  //user id will come from auth middleware's response
  const client = await Client.findById(req.client.id).select('+password');

  //Check if current password mathches
  if (!(await client.matchPassword(req.body.currentPassword))) {
    return next(new errorResponse('Password Incorrect', 401));
  }

  //If password matches then update new password
  client.password = req.body.newPassword;
  await client.save();

  sendTokenResponse(client, 200, res);
});

// @desc     Forgot Password
// @route    POST /api/v1/client/auth/forgotpassword
// @access   Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  //Find the account associated with this email
  const client = await Client.findOne({ email: req.body.email });

  //Check if user exists
  if (!client) {
    return next(new errorResponse(`There is no user with that email`, 404));
  }

  //Get reset token - getResetPasswordToken() defined in user model
  const resetToken = client.getResetPasswordToken();
  console.log(resetToken);

  //Update token and expiry in Databse
  await client.save({ validateBeforeSave: false });

  //Send Mail to user
  //Create reset URL
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/client/auth/resetpassword/${resetToken}`;

  //Create message with reset URL
  const message = `You have requested to reset your password. Please make a PUT request to: \n\n ${resetURL}`;

  //Send Email
  try {
    await sendEmail({
      email: client.email,
      subject: 'Password reset token',
      message: message,
    });

    res
      .status(200)
      .json({ success: true, data: 'Email Sent - check your mail box' });
  } catch (err) {
    console.log(err);
    client.getResetPasswordToken = undefined;
    client.getResetPasswordExpire = undefined;

    //Save user
    await trainer.save({ validateBeforeSave: false });

    return next(new errorResponse('Email could not be sent', 500));
  }
});

// @desc     Reset Password
// @route    PUT /api/v1/trainer/auth/resetpassword:resettoken
// @access   Private
exports.resetPassword = asyncHandler(async (req, res, next) => {
  //Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  //Find user by expiration token
  const client = await Client.findOne({
    resetPasswordToken: resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  //Find if such a user exits // token expired
  if (!client) {
    return next(new errorResponse('Invalid Token', 400));
  }

  //Set new password (new password comes from req body)
  client.password = req.body.password;
  client.resetPasswordToken = undefined;
  client.resetPasswordExpire = undefined;
  await client.save();

  //Call sendTokenResponse to generate token and send it in a cookie
  sendTokenResponse(client, 200, res);
});

//Custom function to create cookie and token
//Get token from model, create cookie ans send response
const sendTokenResponse = (client, statusCode, res) => {
  //Create jwt token
  const token = client.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  //Set secure option in *production* mode
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  //Send response with cookie
  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({ success: true, token: token });
};

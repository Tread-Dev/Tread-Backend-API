const errorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Client = require('../models/Client');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const path = require('path');

// @desc     Register Client User
// @desc     The user will alredy get registered when a trainer adds them as a client. The client signup will just update their existing details in the DB
// @route    PUT /api/v1/client/auth/register
// @access   Public
exports.register = asyncHandler(async (req, res, next) => {
  //Pull out client user information from the body
  const {
    firstName,
    lastName,
    password,
    phone,
    fitnessGoal,
    timeZone,
    height,
    weight,
    gender,
    dob,
  } = req.body;

  //Find the client
  const client = await Client.findById(req.params.clientID);

  //Update client user details
  client.firstName = firstName;
  client.lastName = lastName;
  client.password = password;
  client.phone = phone;
  client.fitnessGoal = fitnessGoal;
  client.timeZone = timeZone;
  client.height = height;
  client.weight = weight;
  client.gender = gender;
  client.dob = dob;
  client.verified = true;

  //Save to DB
  await client.save();

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

  //Check for Client user
  const client = await Client.findOne({ email: email }).select('+password');

  if (!client) {
    return next(new errorResponse(`Invalid credentials`, 401));
  }

  //Check if password matches | *client not Client*
  const isMatch = await client.matchPassword(password);

  if (!isMatch) {
    return next(new errorResponse(`Invalid credentials`, 401));
  }

  //Call sendTokenResponse to generate token and send it in a cookie
  sendTokenResponse(client, 200, res);
});

// @desc     Get Logged in Client User
// @route    POST /api/v1/auth/me
// @access   Private
exports.getMe = asyncHandler(async (req, res, next) => {
  //Client user ID will come from auth middleware's response
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

// @desc     Update password of Logged in Client User
// @route    PUT /api/v1/client/auth/updatepassword
// @access   Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  //Client user id will come from auth middleware's response
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

  //Get reset token - getResetPasswordToken() defined in Cleint user model
  const resetToken = client.getResetPasswordToken();
  console.log(resetToken);

  //Update token and expiry in Databse
  await client.save({ validateBeforeSave: false });

  //Send Mail to Client user
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
// @route    PUT /api/v1/client/auth/resetpassword:resettoken
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

  //Find if such a client user exits // token expired
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

// @desc     Upload photo for Client
// @route    PUT /api/v1/client/:id/photo
// @access   Private
exports.clientPhotoUpload = asyncHandler(async (req, res, next) => {
  //Update Item in DB based on ID
  console.log(req.body);
  const client = await Client.findById(req.client.id);

  //Check if Client exists - Error handling
  if (!client) {
    return next(
      new errorResponse(`User not found with ID of ${req.client.id}`, 404)
    );
  }

  //Make sure the Cleint user is Owner
  // if (client.user.toString() !== req.user.id && req.user.role !== 'admin') {
  //   return next(
  //     new errorResponse(
  //       `User with ID of ${req.params.id} is not authorized to update Client photo`,
  //       401
  //     )
  //   );
  // }

  if (!req.files) {
    return next(new errorResponse(`Please upload a File`, 400));
  }

  const file = req.files.file;

  //Make sure the file is a image
  if (!file.mimetype.startsWith('image')) {
    return next(new errorResponse(`Please upload an Image file`, 400));
  }

  //Check for image file size
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(
      new errorResponse(
        `Please upload an Image file less than ${process.env.MAX_FILE_UPLOAD}`,
        400
      )
    );
  }

  //Rename file name according to Client ID and extension
  file.name = `photo_${client._id}${path.parse(file.name).ext}`;
  console.log(file.name);

  //Upload the file to our server
  file.mv(
    `${process.env.FILE_UPLOAD_PATH}/client/${file.name}`,
    async (err) => {
      if (err) {
        console.error(err);
        return next(new errorResponse(`Problem with File upload`, 400));
      }

      //Insert file name into DB
      await Client.findByIdAndUpdate(req.client.id, { photo: file.name });

      res.status(200).json({ success: true, data: file.name });
    }
  );
});

// @desc     Get Workouts by Client ID
// @route    GET /api/v1/client/workouts/
// @access   Private
exports.getWorkouts = asyncHandler(async (req, res, next) => {
  //Fetch workouts by ID
  console.log(req.client.id);
  const client = await Client.find({ _id: req.client.id });

  //Check if workouts exists - Error handling
  if (!client) {
    return next(
      new errorResponse(`Client not found with ID of ${req.client.id}`, 404)
    );
  }

  //Get assigned workouts of the logged in client
  console.log(client[0].assignedWorkouts);

  //Send workoutObj from client document in DB
  res.status(200).json({ success: true, data: client[0].assignedWorkouts });
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

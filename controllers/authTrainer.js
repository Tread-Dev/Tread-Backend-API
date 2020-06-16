const errorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Trainer = require('../models/Trainer');
const Client = require('../models/Client');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const path = require('path');

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
    trainerType,
    numberOfClients,
  } = req.body;

  //Create new user
  const trainer = await Trainer.create({
    firstName: firstName,
    lastName: lastName,
    email: email,
    password: password,
    role: role,
    trainerType: trainerType,
    numberOfClients: numberOfClients,
  });

  //Call sendTokenResponse to generate token and send it in a cookie
  sendTokenResponse(trainer, 200, res);
});

// @desc     Login Trainer User
// @route    POST /api/v1/trainer/auth/login
// @access   Public
exports.login = asyncHandler(async (req, res, next) => {
  //Pull out user information from the body
  const { email, password } = req.body;

  //Email & Password validation
  if (!email || !password) {
    return next(new errorResponse(`Please provide an email and password`, 400));
  }

  //Check for User
  const trainer = await Trainer.findOne({ email: email }).select('+password');

  if (!trainer) {
    return next(new errorResponse(`Invalid credentials`, 401));
  }

  //Check if password matches | *user not User*
  const isMatch = await trainer.matchPassword(password);

  if (!isMatch) {
    return next(new errorResponse(`Invalid credentials`, 401));
  }

  //Call sendTokenResponse to generate token and send it in a cookie
  sendTokenResponse(trainer, 200, res);
});

// @desc     Get Logged in User
// @route    POST /api/v1/auth/me
// @access   Private
exports.getMe = asyncHandler(async (req, res, next) => {
  //user id will come from auth middleware's response
  const trainer = await Trainer.findById(req.trainer.id);

  res.status(200).json({ success: true, data: trainer });
});

// @desc     Logout Trainer user / clear cookie
// @route    GET /api/v1/trainer/auth/logout
// @access   Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ success: true, data: {} });
});

// @desc     Update Trainer user details
// @route    POST /api/v1/trainer/auth/updatedetails
// @access   Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  //Take only the essential fields from req.body to update - Ignore password, role etc if at all passed
  const fieldsToUpdate = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    trainerType: req.body.trainerType,
    numberOfClients: req.body.numberOfClients,
  };

  //Trainer id will come from auth middleware's response
  const trainer = await Trainer.findByIdAndUpdate(
    req.trainer.id,
    fieldsToUpdate,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({ success: true, data: trainer });
});

// @desc     Update password of Logged in Trainer User
// @route    PUT /api/v1/trainer/auth/updatepassword
// @access   Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  //user id will come from auth middleware's response
  const trainer = await Trainer.findById(req.trainer.id).select('+password');

  //Check if current password mathches
  if (!(await trainer.matchPassword(req.body.currentPassword))) {
    return next(new errorResponse('Password Incorrect', 401));
  }

  //If password matches then update new password
  trainer.password = req.body.newPassword;
  await trainer.save();

  sendTokenResponse(trainer, 200, res);
});

// @desc     Forgot Password
// @route    POST /api/v1/trainer/auth/forgotpassword
// @access   Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  //Find the account associated with this email
  const trainer = await Trainer.findOne({ email: req.body.email });

  //Check if user exists
  if (!trainer) {
    return next(new errorResponse(`There is no user with that email`, 404));
  }

  //Get reset token - getResetPasswordToken() defined in user model
  const resetToken = trainer.getResetPasswordToken();
  console.log(resetToken);

  //Update token and expiry in Databse
  await trainer.save({ validateBeforeSave: false });

  //Send Mail to user
  //Create reset URL
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/trainer/auth/resetpassword/${resetToken}`;

  //Create message with reset URL
  const message = `You have requested to reset your password. Please make a PUT request to: \n\n ${resetURL}`;

  //Send Email
  try {
    await sendEmail({
      email: trainer.email,
      subject: 'Password reset token',
      message: message,
    });

    res
      .status(200)
      .json({ success: true, data: 'Email Sent - check your mail box' });
  } catch (err) {
    console.log(err);
    trainer.getResetPasswordToken = undefined;
    trainer.getResetPasswordExpire = undefined;

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
  const trainer = await Trainer.findOne({
    resetPasswordToken: resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  //Find if such a user exits // token expired
  if (!trainer) {
    return next(new errorResponse('Invalid Token', 400));
  }

  //Set new password (new password comes from req body)
  trainer.password = req.body.password;
  trainer.resetPasswordToken = undefined;
  trainer.resetPasswordExpire = undefined;
  await trainer.save();

  //Call sendTokenResponse to generate token and send it in a cookie
  sendTokenResponse(trainer, 200, res);
});

// @desc     Upload photo for Client
// @route    PUT /api/v1/trainer/:id/photo
// @access   Private
exports.trainerPhotoUpload = asyncHandler(async (req, res, next) => {
  //Update Item in DB based on ID
  console.log(req.body);
  const trainer = await Trainer.findById(req.params.id);

  //Check if bootcamp exists - Error handling
  if (!trainer) {
    return next(
      new errorResponse(`Bootcamp not found with ID of ${req.params.id}`, 404)
    );
  }

  //Make sure the user is Bootcamp Owner
  // if (client.user.toString() !== req.user.id && req.user.role !== 'admin') {
  //   return next(
  //     new errorResponse(
  //       `User with ID of ${req.params.id} is not authorized to update bootcamp photo`,
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

  //Rename file name according to Bootcamp ID and extension
  file.name = `photo_${trainer._id}${path.parse(file.name).ext}`;
  console.log(file.name);

  //Upload the file to our server
  file.mv(
    `${process.env.FILE_UPLOAD_PATH}/trainer/${file.name}`,
    async (err) => {
      if (err) {
        console.error(err);
        return next(new errorResponse(`Problem with File upload`, 400));
      }

      //Insert file name into DB
      await Trainer.findByIdAndUpdate(req.params.id, { photo: file.name });

      res.status(200).json({ success: true, data: file.name });
    }
  );
});

// @desc     Add New Client to Trainer
// @route    POST /api/v1/trainer/auth/addclient
// @access   Public
exports.addClient = asyncHandler(async (req, res, next) => {
  //Pull out user information from the body
  const { firstName, lastName, email, clientType } = req.body;
  let trainer = req.trainer.id;

  //Create new Clent
  const client = await Client.create({
    firstName: firstName,
    lastName: lastName,
    email: email,
    clientType: clientType,
    trainer: trainer,
  });

  if (client) {
    //Send mail to client
    //Create reset URL
    const signUpURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/client/auth/register/${client._id}`;

    console.log(signUpURL);

    //Create message with reset URL
    const message = `Kindly make a put request with the req body object containing the client info to : \n\n ${signUpURL}`;

    //Send Email
    try {
      await sendEmail({
        email: client.email,
        subject: 'Tread - Client Signup',
        message: message,
      });

      //Send back response
      res
        .status(200)
        .json({ success: true, data: client, msg: 'Mail sent - check inbox' });
    } catch (err) {
      console.log(err);
      return next(new errorResponse('Email could not be sent', 500));
    }
  } else {
    return next(new errorResponse('Client could not be added!', 401));
  }
});

// @desc     Get All Clients of the trainer
// @route    POST /api/v1/auth/getclients
// @access   Private
exports.getClients = asyncHandler(async (req, res, next) => {
  //user id will come from auth middleware's response
  const clients = await Client.find({ trainer: req.trainer.id });

  res.status(200).json({ success: true, data: clients });
});

//Custom function to create cookie and token
//Get token from model, create cookie ans send response
const sendTokenResponse = (trainer, statusCode, res) => {
  //Create jwt token
  const token = trainer.getSignedJwtToken();

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

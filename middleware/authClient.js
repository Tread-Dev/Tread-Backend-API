const jwt = require('jsonwebtoken');
const asyncHandler = require('./async');
const errorResponse = require('../utils/errorResponse');
const Client = require('../models/Client');

//Protect routes
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  //Check if token exists and in correct format - Bearer <Token>
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    //Get token alone and remove 'Bearer'
    //Set token from Bearer Token
    token = req.headers.authorization.split(' ')[1];
  }
  //Set token from cookie
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  //Make sure the token exists
  if (!token) {
    return next(new errorResponse('Not authorized to access this route', 401));
  }

  //Verify token if it exists
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded);

    //Fetch the current user and asign it to req object
    req.client = await Client.findById(decoded.id);
    next();
  } catch (err) {
    return next(new errorResponse('Not authorized to access this route', 401));
  }
});

//Grant access to specific roles (admin, publisher)
// exports.authorize = (...roles) => {
//   return (req, res, next) => {
//     if (!roles.includes(req.client.role)) {
//       return next(
//         new errorResponse(
//           `User role - ${req.client.role} is not authorized to access this route`,
//           401
//         )
//       );
//     }
//     next();
//   };
// };

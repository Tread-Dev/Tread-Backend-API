const errorResponse = require('../utils/errorResponse');

//Error handler middleware function
const errorHandler = (err, req, res, next) => {
  let error = { ...err };

  error.message = err.message;

  //Console log to Dev
  console.log(err);

  //Mongoose bad objectId
  if (err.name === 'CastError') {
    const message = `Resource not found with ID of ${err.value}`;
    error = new errorResponse(message, 404);
  }

  //Mongoose Duplicate Key
  if (err.code === 11000) {
    const message = `Duplicate value entered | Resource with the same name exists`;
    error = new errorResponse(message, 400);
  }

  //Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message);
    error = new errorResponse(message, 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
  });
};

module.exports = errorHandler;

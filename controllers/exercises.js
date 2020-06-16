const Exercise = require('../models/Exercise');
const Trainer = require('../models/Trainer');
const errorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc     Add exercise
// @route    POST /api/v1/trainer/:trainerId/exercise
// @access   Private
exports.addExercise = asyncHandler(async (req, res, next) => {
  // Trainer ID will be sent in the req body
  //Check if the particular trainer to which the exercise needs to be added exists or not
  const trainer = await Trainer.findById(req.body.trainer);
  if (!trainer) {
    return next(
      new errorResponse(
        `No trainer exists with the ID of ${req.body.trainer}`,
        404
      )
    );
  }

  //Make sure the user is Bootcamp Owner
  // if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
  //   return next(
  //     new errorResponse(
  //       `User with ID of ${req.user.id} is not authorized to add a course to Bootcamp -  ${bootcamp._id}`,
  //       401
  //     )
  //   );
  // }

  //Create the new exercise
  const exercise = await Exercise.create(req.body);

  res.status(200).json({
    success: true,
    data: exercise,
  });
});

// @desc     Get Exercises by Trainer ID
// @route    GET /api/v1/trainer/exercises/
// @access   Private
exports.getExercises = asyncHandler(async (req, res, next) => {
  //Fetch exercises by ID
  console.log(req.trainer.id);
  const exercises = await Exercise.find({ trainer: req.trainer.id });

  //Check if exercises exists - Error handling
  if (!exercises) {
    return next(
      new errorResponse(
        `Excercises not found with ID of ${req.trainer.id}`,
        404
      )
    );
  }

  res.status(200).json({ success: true, data: exercises });
});

// @desc     Get Exercise by Exercise ID
// @route    GET /api/v1/trainer/exercises/:exerciseID
// @access   Private
exports.getExercisebyId = asyncHandler(async (req, res, next) => {
  //Fetch exercise by ID
  console.log(req.params.exerciseID);
  const exercise = await Exercise.find({ _id: req.params.exerciseID });

  //Check if exercise exists - Error handling
  if (!exercise) {
    return next(
      new errorResponse(
        `Excercise not found with ID of ${req.params.exerciseID}`,
        404
      )
    );
  }

  res.status(200).json({ success: true, data: exercise });
});

// @desc     Update exercise by ID
// @route    PUT /api/v1/trainer/exercises/:exerciseID
// @access   Private
exports.updateExercise = asyncHandler(async (req, res, next) => {
  //Update Item in DB based on ID
  console.log(req.body);
  //Fintd bootcamp by ID
  let exercise = await Exercise.findById(req.params.exerciseID);

  //Check if exercise exists - Error handling
  if (!exercise) {
    return next(
      new errorResponse(
        `exercise not found with ID of ${req.params.exerciseID}`,
        404
      )
    );
  }

  //Make sure the user is exercise Owner
  if (
    exercise.trainer.toString() !== req.trainer.id &&
    req.trainer.role !== 'admin'
  ) {
    return next(
      new errorResponse(
        `User with ID of ${req.trainer.id} is not authorized to update this exercise`,
        401
      )
    );
  }

  exercise = await Exercise.findOneAndUpdate(req.params.exerciseID, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(201).json({ success: true, data: exercise });
});

// @desc     Delete exercise by ID
// @route    DELETE /api/v1/trainer/exercise/:exerciseID
// @access   Private
exports.deleteExercise = asyncHandler(async (req, res, next) => {
  //Find exercise in DB based on ID
  console.log(req.body);
  const exercise = await Exercise.findById(req.params.exerciseID);

  //Check if exercise exists - Error handling
  if (!exercise) {
    return next(
      new errorResponse(
        `exercise not found with ID of ${req.params.exerciseID}`,
        404
      )
    );
  }

  //Make sure the trainer is exercise Owner
  if (
    exercise.trainer.toString() !== req.trainer.id &&
    req.trainer.role !== 'admin'
  ) {
    return next(
      new errorResponse(
        `User with ID of ${req.trainer.id} is not authorized to delete this exercise`,
        401
      )
    );
  }

  exercise.remove();

  res.status(201).json({ success: true, data: {} });
});

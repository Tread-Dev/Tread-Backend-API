const Workout = require('../models/Workout');
const Trainer = require('../models/Trainer');
const Client = require('../models/Client');
const errorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc     Add workout
// @route    POST /api/v1/trainer/:trainerId/exercise
// @access   Private
exports.addWorkout = asyncHandler(async (req, res, next) => {
  // Trainer ID will be sent in the req body
  //Check if the particular trainer to which the exercise needs to be added exists or not
  const trainer = await Trainer.findById(req.trainer.id);
  if (!trainer) {
    return next(
      new errorResponse(
        `No trainer exists with the ID of ${req.trainer.id}`,
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

  //Pass the current Trainer ID to body
  req.body.trainer = req.trainer.id;
  //Create the new exercise
  const workout = await Workout.create(req.body);

  res.status(200).json({
    success: true,
    data: workout,
  });
});

// @desc     Get Workouts by Trainer ID
// @route    GET /api/v1/trainer/workouts/
// @access   Private
exports.getWorkouts = asyncHandler(async (req, res, next) => {
  //Fetch workouts by ID
  console.log(req.trainer.id);
  const workouts = await Workout.find({ trainer: req.trainer.id });

  //Check if workouts exists - Error handling
  if (!workouts) {
    return next(
      new errorResponse(`Workouts not found with ID of ${req.trainer.id}`, 404)
    );
  }

  res.status(200).json({ success: true, data: workouts });
});

// @desc     Get Workout by Workout ID
// @route    GET /api/v1/trainer/workouts/:workoutID
// @access   Private
exports.getWorkoutById = asyncHandler(async (req, res, next) => {
  //Fetch workout by ID
  console.log(req.params.workoutID);
  const workout = await Workout.find({ _id: req.params.workoutID });

  //Check if exercise exists - Error handling
  if (!workout) {
    return next(
      new errorResponse(
        `Workout not found with ID of ${req.params.workoutID}`,
        404
      )
    );
  }

  res.status(200).json({ success: true, data: workout });
});

// @desc     Update workout by ID
// @route    PUT /api/v1/trainer/workouts/:workoutID
// @access   Private
exports.updateWorkout = asyncHandler(async (req, res, next) => {
  //Update Item in DB based on ID
  console.log(req.body);
  //Fintd workout by ID
  let workout = await Workout.findById(req.params.workoutID);

  //Check if workout exists - Error handling
  if (!workout) {
    return next(
      new errorResponse(
        `Workout not found with ID of ${req.params.workoutID}`,
        404
      )
    );
  }

  //Make sure the user is workout Owner
  if (
    workout.trainer.toString() !== req.trainer.id &&
    req.trainer.role !== 'admin'
  ) {
    return next(
      new errorResponse(
        `User with ID of ${req.trainer.id} is not authorized to update this workout`,
        401
      )
    );
  }

  //Add current logged in trainer's ID to the body
  req.body.trainer = req.trainer.id;
  workout = await Workout.findOneAndUpdate(req.params.workoutID, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(201).json({ success: true, data: workout });
});

// @desc     Delete workout by ID
// @route    DELETE /api/v1/trainer/workouts/:workoutID
// @access   Private
exports.deleteWorkout = asyncHandler(async (req, res, next) => {
  //Find workout in DB based on ID
  console.log(req.body);
  const workout = await Workout.findById(req.params.workoutID);

  //Check if workout exists - Error handling
  if (!workout) {
    return next(
      new errorResponse(
        `Workout not found with ID of ${req.params.workoutID}`,
        404
      )
    );
  }

  //Make sure the trainer is exercise Owner
  if (
    workout.trainer.toString() !== req.trainer.id &&
    req.trainer.role !== 'admin'
  ) {
    return next(
      new errorResponse(
        `User with ID of ${req.trainer.id} is not authorized to delete this workout`,
        401
      )
    );
  }

  workout.remove();

  res.status(201).json({ success: true, data: {} });
});

// @desc     Assign workout for client
// @route    PUT /api/v1/trainer/workouts/assignworkout/:clientID
// @access   Private
exports.assignWorkout = asyncHandler(async (req, res, next) => {
  //Get workout Obj from the workout document using req.body.workoutID
  console.log(req.body.workoutID);
  const workout = await Workout.find({ _id: req.body.workoutID });

  //Check if workout exists - Error handling
  if (!workout) {
    return next(
      new errorResponse(
        `Workout not found with ID of ${req.body.workoutID}`,
        404
      )
    );
  }

  // console.log(workout[0].workoutObj);

  //Take the workout details from the workout object
  const { workoutObj, name, description } = workout[0];

  // console.log(workoutObj);
  // console.log(name);
  // console.log(description);

  //Take client ID from req params
  const clientID = req.params.clientID;
  //Take only the essential fields from req.body to update - Ignore password, role etc if at all passed
  const fieldsToUpdate = {
    workoutID: req.body.workoutID,
    assignedDate: req.body.assignedDate,
    completed: req.body.completed,
    workoutObj: workoutObj,
    name: name,
    description: description,
  };

  //Client id will come from auth middleware's response
  const client = await Client.findByIdAndUpdate(
    clientID,
    { $push: { assignedWorkouts: fieldsToUpdate } },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({ success: true, data: client });
});

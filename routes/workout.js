const express = require('express');
const router = express.Router({ mergeParams: true });

const {
  addWorkout,
  getWorkouts,
  getWorkoutById,
  updateWorkout,
  deleteWorkout,
} = require('../controllers/workouts');

const Workouts = require('../models/Workout');
const advancedResults = require('../middleware/advancedResults');

//Authorisation protect middleware
const { protect, authorize } = require('../middleware/authTrainer');

// router.route('/').post(protect, addWorkout);

router.route('/').get(protect, getWorkouts).post(protect, addWorkout);

router
  .route('/:workoutID')
  .get(protect, getWorkoutById)
  .put(protect, updateWorkout)
  .delete(protect, deleteWorkout);

module.exports = router;

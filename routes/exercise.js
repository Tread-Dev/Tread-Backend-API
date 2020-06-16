const express = require('express');
const router = express.Router({ mergeParams: true });

const {
  addExercise,
  getExercises,
  getExercisebyId,
  updateExercise,
  deleteExercise,
} = require('../controllers/exercises');

const Exercise = require('../models/Exercise');
const advancedResults = require('../middleware/advancedResults');

//Authorisation protect middleware
const { protect, authorize } = require('../middleware/authTrainer');

router.route('/').get(protect, getExercises).post(protect, addExercise);

router
  .route('/:exerciseID')
  .get(protect, getExercisebyId)
  .put(protect, updateExercise)
  .delete(protect, deleteExercise);

module.exports = router;

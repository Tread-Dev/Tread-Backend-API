const mongoose = require('mongoose');

const ExerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: [true, 'Please add an exercise name'],
    unique: true,
  },
  videoLink: {
    type: String,
    required: [true, 'Please add the Video link'],
  },
  description: {
    type: String,
    required: [true, 'Please add exercise description'],
  },
  muscleGroup: {
    type: [String],
    required: [true, 'Please add a muscle group'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  trainer: {
    type: mongoose.Schema.ObjectId,
    ref: 'Trainer',
    required: true,
  },
});

module.exports = mongoose.model('Exercise', ExerciseSchema);

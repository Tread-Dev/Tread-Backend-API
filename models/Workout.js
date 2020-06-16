const mongoose = require('mongoose');

const WorkoutSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: [true, 'Please add a workout name'],
    unique: true,
  },
  description: {
    type: String,
    required: [true, 'Please add workout description'],
  },
  trainer: {
    type: mongoose.Schema.ObjectId,
    ref: 'Trainer',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  workoutObj: [
    {
      exerciseID: {
        type: mongoose.Schema.ObjectId,
        ref: 'Exercise',
        required: [true, 'Please add exercise ID'],
      },
      cardIndex: {
        type: Number,
        required: [true, 'Please add cardIndex'],
      },
      reps: {
        type: Number,
        default: 0,
      },
      time: {
        type: Number,
        default: 0,
      },
      rest: {
        type: Number,
        default: 0,
      },
    },
  ],
});

module.exports = mongoose.model('Workout', WorkoutSchema);

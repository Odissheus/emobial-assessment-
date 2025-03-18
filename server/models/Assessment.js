// server/models/Assessment.js
const mongoose = require('mongoose');

const AssessmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  gadScore: {
    type: Number,
    required: true
  },
  phqScore: {
    type: Number,
    required: true
  },
  gadResponses: [Number],
  phqResponses: [Number],
  phqDifficulty: Number
});

module.exports = mongoose.model('Assessment', AssessmentSchema);
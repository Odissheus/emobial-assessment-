// server/models/Assessment.js
const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'L\'ID del paziente è obbligatorio']
  },
  gadScore: {
    type: Number,
    required: [true, 'Il punteggio GAD-7 è obbligatorio'],
    min: 0,
    max: 21
  },
  phqScore: {
    type: Number,
    required: [true, 'Il punteggio PHQ-9 è obbligatorio'],
    min: 0,
    max: 27
  },
  gadResponses: {
    type: [Number],
    required: [true, 'Le risposte GAD-7 sono obbligatorie'],
    validate: {
      validator: function(array) {
        return array.length === 7;
      },
      message: 'GAD-7 deve avere esattamente 7 risposte'
    }
  },
  phqResponses: {
    type: [Number],
    required: [true, 'Le risposte PHQ-9 sono obbligatorie'],
    validate: {
      validator: function(array) {
        return array.length === 9;
      },
      message: 'PHQ-9 deve avere esattamente 9 risposte'
    }
  },
  phqDifficulty: {
    type: Number,
    default: null
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Aggiunge automaticamente createdAt e updatedAt
});

// Indici per migliorare le prestazioni delle query
assessmentSchema.index({ patientId: 1 });
assessmentSchema.index({ date: -1 });

module.exports = mongoose.model('Assessment', assessmentSchema);
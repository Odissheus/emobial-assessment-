// server/routes/assessments.js
const express = require('express');
const router = express.Router();
const Assessment = require('../models/Assessment');
const Patient = require('../models/Patient');

// Get all assessments
router.get('/', async (req, res) => {
  try {
    const assessments = await Assessment.find().sort({ date: -1 });
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get assessments by patient id
router.get('/patient/:patientId', async (req, res) => {
  try {
    const assessments = await Assessment.find({ patientId: req.params.patientId }).sort({ date: -1 });
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single assessment
router.get('/:id', async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
    res.json(assessment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create assessment
router.post('/', async (req, res) => {
  try {
    // Verify patient exists
    const patient = await Patient.findById(req.body.patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    
    const assessment = new Assessment({
      patientId: req.body.patientId,
      gadScore: req.body.gadScore,
      phqScore: req.body.phqScore,
      gadResponses: req.body.gadResponses,
      phqResponses: req.body.phqResponses,
      phqDifficulty: req.body.phqDifficulty
    });

    const newAssessment = await assessment.save();
    res.status(201).json(newAssessment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
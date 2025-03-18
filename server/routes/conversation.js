// server/routes/conversation.js
const express = require('express');
const router = express.Router();
const llmService = require('../services/llm-service');

// Start a new conversation
router.post('/start', async (req, res) => {
  try {
    const { patientName } = req.body;
    if (!patientName) {
      return res.status(400).json({ message: 'Patient name is required' });
    }
    
    const result = await llmService.startConversation(patientName);
    res.json(result);
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({ message: 'Error starting conversation', error: error.message });
  }
});

// Get next question
router.post('/next-question', async (req, res) => {
  try {
    const { conversationState } = req.body;
    if (!conversationState) {
      return res.status(400).json({ message: 'Conversation state is required' });
    }
    
    const result = await llmService.getNextQuestion(conversationState);
    res.json(result);
  } catch (error) {
    console.error('Error getting next question:', error);
    res.status(500).json({ message: 'Error getting next question', error: error.message });
  }
});

// Process patient response
router.post('/process-response', async (req, res) => {
  try {
    const { conversationState, questionId, score } = req.body;
    if (!conversationState || score === undefined || !questionId) {
      return res.status(400).json({ message: 'Conversation state, question ID, and score are required' });
    }
    
    const result = await llmService.processResponse(conversationState, questionId, score);
    res.json(result);
  } catch (error) {
    console.error('Error processing response:', error);
    res.status(500).json({ message: 'Error processing response', error: error.message });
  }
});

module.exports = router;
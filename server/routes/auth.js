// server/routes/auth.js
const express = require('express');
const router = express.Router();

// Credenziali hardcoded (in un'applicazione reale, usare un database)
const validCredentials = {
  username: 'adminemobial',
  password: 'admintest'
};

// Login route
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === validCredentials.username && password === validCredentials.password) {
    return res.json({
      success: true,
      message: 'Login successful',
      user: {
        username,
        role: 'admin'
      }
    });
  } else {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Check authentication status
router.get('/status', (req, res) => {
  // In un'implementazione reale, verificare il token JWT
  res.json({ isAuthenticated: false });
});

module.exports = router;
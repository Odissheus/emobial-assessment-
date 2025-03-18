// server/index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

// Importa rotte
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const assessmentRoutes = require('./routes/assessments');
const conversationRoutes = require('./routes/conversation');

// Configurazione variabili d'ambiente con percorso specifico
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Inizializzazione app Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connessione database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Rotte
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/conversation', conversationRoutes);

// Rotta di base
app.get('/', (req, res) => {
  res.send('EmoBial API is running');
});

// Ascolto server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
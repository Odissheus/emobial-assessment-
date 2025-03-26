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
dotenv.config({ path: path.resolve(__dirname, '../../Emobial/.env') });

// Inizializzazione app Express
const app = express();
const PORT = process.env.PORT || 5000;

// NUOVA Configurazione CORS corretta
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://emobial.netlify.app', // modificare con l'URL reale del tuo frontend
    'https://emobial-assessment.onrender.com' // modificare con l'URL reale del tuo backend
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Middleware per il parsing JSON con dimensione aumentata
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger middleware per debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Log del body per le richieste POST e PUT
  if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
    console.log('Request Body:', 
      req.url.includes('password') ? '***HIDDEN***' : JSON.stringify(req.body)
    );
  }
  
  // Monitora anche le risposte
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`[${new Date().toISOString()}] Response Status: ${res.statusCode}`);
    return originalSend.apply(res, arguments);
  };
  
  next();
});

// Endpoint di test per la connessione al database
app.get('/api/test-db', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        error: 'Database non connesso',
        readyState: mongoose.connection.readyState
      });
    }
    
    const count = await mongoose.connection.db.collection('patients').countDocuments();
    
    res.json({
      status: 'success',
      message: 'Connessione al database riuscita',
      databaseName: mongoose.connection.name,
      patientCount: count
    });
  } catch (error) {
    console.error('Errore test database:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint di test per la creazione di un paziente
app.get('/api/test-create-patient', async (req, res) => {
  try {
    const Patient = mongoose.model('Patient');
    const testPatient = new Patient({
      firstName: "Test",
      lastName: "Utente",
      age: 30
    });
    
    const savedPatient = await testPatient.save();
    
    res.json({
      message: 'Paziente di test creato con successo',
      patient: savedPatient
    });
  } catch (error) {
    console.error('Errore nella creazione del paziente di test:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint di test per la creazione di una valutazione
app.get('/api/test-create-assessment/:patientId', async (req, res) => {
  try {
    const Assessment = mongoose.model('Assessment');
    const testAssessment = new Assessment({
      patientId: req.params.patientId,
      gadScore: 10,
      phqScore: 12,
      gadResponses: [1, 2, 1, 2, 2, 1, 1],
      phqResponses: [1, 2, 1, 2, 2, 1, 0, 2, 1],
      date: new Date()
    });
    
    const savedAssessment = await testAssessment.save();
    
    res.json({
      message: 'Valutazione di test creata con successo',
      assessment: savedAssessment
    });
  } catch (error) {
    console.error('Errore nella creazione della valutazione di test:', error);
    res.status(500).json({ error: error.message });
  }
});

// Connessione database con logging migliorato
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  console.log(`Database name: ${mongoose.connection.name}`);
  console.log(`Connection state: ${mongoose.connection.readyState}`);
  
  // Elenca le collezioni esistenti
  mongoose.connection.db.listCollections().toArray((err, collections) => {
    if (err) {
      console.error('Errore nell\'elenco delle collezioni:', err);
    } else {
      console.log('Collezioni nel database:');
      collections.forEach(col => console.log(`- ${col.name}`));
    }
  });
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  // Maschera la password nella stringa di connessione per il log
  const maskedURI = process.env.MONGODB_URI ?
    process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@') :
    'MONGODB_URI not defined';
  console.error('Connection string (masked):', maskedURI);
});

// Rotte
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/conversation', conversationRoutes);

// Rotta di health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'EmoBial API is running',
    environment: process.env.NODE_ENV || 'development',
    mongoConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Rotta di base
app.get('/', (req, res) => {
  res.send('EmoBial API is running');
});

// Middleware per gestione errori 404
app.use((req, res, next) => {
  console.log(`[404] Route non trovata: ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`
  });
});

// Middleware per gestione errori globali
app.use((err, req, res, next) => {
  console.error('Errore del server:', err);
  res.status(500).json({
    error: 'Server Error',
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// Ascolto server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Server API URL: http://localhost:${PORT}`);
  console.log(`🔍 Test endpoint: http://localhost:${PORT}/api/test-db`);
});
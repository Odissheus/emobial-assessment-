// server/config/db.js
const mongoose = require('mongoose');
require('dotenv').config();

// Stringa di connessione MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERRORE: Variabile d\'ambiente MONGODB_URI non impostata nel file .env');
  process.exit(1);
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB connesso: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`Errore connessione MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
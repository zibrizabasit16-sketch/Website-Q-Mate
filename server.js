const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Port wajib mengikuti environment Railway secara mutlak
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Memuat rute transaksi yang ada di folder /routes/transactionRoutes.js (jika ada)
try {
  const transactionRoutes = require('./routes/transactionRoutes');
  app.use('/api', transactionRoutes);
} catch (e) {
  console.log('Menggunakan rute inline standar.');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Q-MATE Backend Active' });
});

// Sajikan seluruh file statis dari root folder (tempat index.html berada)
app.use(express.static(path.join(__dirname)));

// Route fallback utama untuk index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Jalankan Server dengan binding '0.0.0.0' wajib untuk Railway
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Q-MATE Server is successfully running on port ${PORT}`);
});
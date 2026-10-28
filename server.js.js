require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const transactionRoutes = require('./routes/transactionRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Q-MATE Backend', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api', transactionRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Q-MATE Backend running on port ${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Midtrans API: ${process.env.MIDTRANS_API_BASE || 'sandbox'}`);
});

module.exports = app;

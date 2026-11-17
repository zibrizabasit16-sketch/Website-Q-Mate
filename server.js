const express = require('express');
const cors = require('cors');
const midtransClient = require('midtrans-client');

const app = express();
// Gunakan port dinamis dari Railway (process.env.PORT), fallback ke 3000
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Inisialisasi Midtrans Snap API
const snap = new midtransClient.Snap({
  isProduction: true,
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || ''
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Q-MATE Backend Active' });
});

// Endpoint Utama untuk Transaksi QRIS Midtrans
app.post('/api/checkout', async (req, res) => {
  try {
    const { orderId, amount, customerDetails } = req.body;
    
    const parameter = {
      transaction_details: {
        order_id: orderId || `Q-MATE-${Date.now()}`,
        gross_amount: parseInt(amount) || 10000
      },
      credit_card: { secure: true },
      customer_details: customerDetails || {
        first_name: "Customer",
        email: "customer@qmate.com"
      }
    };

    const transaction = await snap.createTransaction(parameter);
    res.json({ success: true, token: transaction.token, redirect_url: transaction.redirect_url });
  } catch (error) {
    console.error('Midtrans Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Server Listener wajib pakai process.env.PORT
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Q-MATE Backend running on port ${PORT}`);
});

module.exports = app;
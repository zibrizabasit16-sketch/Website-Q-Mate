const express = require('express');
const path = require('path');
const cors = require('cors');
const midtransClient = require('midtrans-client');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inisialisasi Midtrans Snap API
const snap = new midtransClient.Snap({
  isProduction: true,
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || ''
});

console.log('✨ Midtrans Snap diinisialisasi (isProduction: true)');

// Endpoint API Transaksi (Langsung aktif tanpa file tambahan)
app.post('/api/transactions', async (req, res) => {
  try {
    const { customerName, customerEmail, totalAmount, orderId, items } = req.body;
    
    const transactionOrderId = orderId || `QMATE-${Date.now()}`;
    const grossAmount = parseInt(totalAmount) || 10000;

    const parameter = {
      transaction_details: {
        order_id: transactionOrderId,
        gross_amount: grossAmount
      },
      customer_details: {
        first_name: customerName || 'Pelanggan Q-MATE',
        email: customerEmail || 'pelanggan@qmate.com'
      },
      item_details: items ? items.map(item => ({
        id: item.name.replace(/\s+/g, '-').toLowerCase(),
        price: item.price,
        quantity: item.qty,
        name: item.name
      })) : []
    };

    const transaction = await snap.createTransaction(parameter);
    
    res.json({
      success: true,
      message: 'Snap Token berhasil dibuat',
      data: {
        snapToken: transaction.token,
        redirectUrl: transaction.redirect_url,
        orderId: transactionOrderId
      }
    });
  } catch (error) {
    console.error('Midtrans Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Terjadi kesalahan pada server pembayaran'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Q-MATE Backend Active' });
});

// Sajikan file statis dari root folder
app.use(express.static(path.join(__dirname)));

// Route fallback ke index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Jalankan Server pada port Railway
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Q-MATE Server is successfully running on port ${PORT}`);
});
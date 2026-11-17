const express = require('express');
const path = require('path');
const cors = require('cors');
const midtransClient = require('midtrans-client');

const app = express();

// Port wajib mengikuti environment Railway secara mutlak
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inisialisasi Midtrans Snap API menggunakan Environment Variables dari Railway
const snap = new midtransClient.Snap({
  isProduction: true,
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || ''
});

// 1. Endpoint API untuk membuat transaksi & Snap Token Midtrans
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

// 2. Health check endpoint untuk memantau status server
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Q-MATE Backend Active' });
});

// 3. Sajikan seluruh file statis (index.html, aset, dll)
app.use(express.static(path.join(__dirname)));

// 4. Route fallback utama untuk merender index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Jalankan Server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Q-MATE Server is successfully running on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('Server failed to start:', err);
});
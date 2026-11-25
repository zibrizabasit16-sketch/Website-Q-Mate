const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const ORDERS_FILE = path.join(__dirname, 'orders-data.json');
const SALES_FILE = path.join(__dirname, 'sales-history.json');

function readJsonArray(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
      return [];
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function writeJsonArray(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readOrders() {
  return readJsonArray(ORDERS_FILE);
}

function writeOrders(orders) {
  writeJsonArray(ORDERS_FILE, orders);
}

function readSales() {
  return readJsonArray(SALES_FILE);
}

function writeSales(sales) {
  writeJsonArray(SALES_FILE, sales);
}

// Verifikasi Login Email & Password Admin
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body || {};
  const validEmail = (process.env.ADMIN_EMAIL || 'zibrizabasit16@gmail.com').trim().toLowerCase();
  const validPassword = process.env.ADMIN_PASSWORD || 'QmateAdmin2026';

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
  }

  if (String(email).trim().toLowerCase() !== validEmail || String(password) !== validPassword) {
    return res.status(401).json({ success: false, message: 'Email atau password admin salah' });
  }

  return res.json({
    success: true,
    admin: { email: validEmail }
  });
});

// Transaksi Midtrans Snap
app.post('/api/transactions', async (req, res) => {
  try {
    const { customerName, customerEmail, totalAmount, booth, items } = req.body || {};
    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      return res.status(500).json({
        success: false,
        message: 'MIDTRANS_SERVER_KEY belum diatur di Railway'
      });
    }

    const grossAmount = Math.round(Number(totalAmount) || 0);
    if (grossAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Total pembayaran tidak valid'
      });
    }

    const orderId = 'QMATE-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900);
    const isProduction = !serverKey.startsWith('SB-');
    const snapUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const authHeader = 'Basic ' + Buffer.from(serverKey + ':').toString('base64');

    const itemDetails = Array.isArray(items) && items.length > 0
      ? items.map((it, idx) => ({
          id: 'ITEM-' + (idx + 1),
          price: Math.round(Number(it.price) || 0),
          quantity: Math.max(1, Math.round(Number(it.qty) || 1)),
          name: String(it.name || 'Menu Q-MATE').slice(0, 50)
        }))
      : [{
          id: 'ITEM-1',
          price: grossAmount,
          quantity: 1,
          name: 'Pesanan Q-MATE'
        }];

    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount
      },
      customer_details: {
        first_name: String(customerName || 'Pelanggan Q-MATE').slice(0, 50),
        email: String(customerEmail || 'pelanggan@qmate.com')
      },
      item_details: itemDetails,
      custom_field1: booth || 'B-04'
    };

    const midtransRes = await fetch(snapUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(payload)
    });

    const midtransData = await midtransRes.json().catch(() => ({}));

    if (!midtransRes.ok || !midtransData.token) {
      return res.status(midtransRes.status || 400).json({
        success: false,
        message: (midtransData.error_messages && midtransData.error_messages[0]) || midtransData.message || 'Gagal membuat transaksi Midtrans'
      });
    }

    return res.json({
      success: true,
      data: {
        orderId,
        snapToken: midtransData.token,
        redirectUrl: midtransData.redirect_url || null
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Terjadi kesalahan pada server transaksi'
    });
  }
});

// Ambil antrean aktif
app.get('/api/orders', (req, res) => {
  const orders = readOrders();
  res.json({ success: true, data: orders });
});

// Ambil seluruh arsip penjualan & omset
app.get('/api/sales', (req, res) => {
  const sales = readSales();
  res.json({ success: true, data: sales });
});

// Simpan pesanan baru ke antrean aktif & arsip omset permanen
app.post('/api/orders', (req, res) => {
  const incoming = req.body || {};
  if (!incoming.orderId) {
    return res.status(400).json({ success: false, message: 'orderId wajib diisi' });
  }

  const orders = readOrders();
  const exists = orders.find((o) => o.orderId === incoming.orderId);

  if (!exists) {
    const now = new Date();
    const maxExistingQueue = orders.reduce((maxVal, item) => {
      const parsed = parseInt(String(item.queueNumber || '0').replace(/\D/g, ''), 10);
      return !Number.isNaN(parsed) && parsed > maxVal ? parsed : maxVal;
    }, 0);

    const queueNumber = String(maxExistingQueue + 1).padStart(3, '0');
    const newOrder = {
      orderId: incoming.orderId,
      queueNumber,
      customerName: incoming.customerName || 'Pelanggan Q-MATE',
      customerEmail: incoming.customerEmail || 'pelanggan@qmate.com',
      items: Array.isArray(incoming.items) ? incoming.items : [],
      totalAmount: Number(incoming.totalAmount) || 0,
      createdAt: incoming.createdAt || now.toISOString(),
      date: incoming.date || now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: incoming.time || now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.'),
      status: incoming.status === 'Selesai' ? 'Selesai' : 'Diproses'
    };

    orders.unshift(newOrder);
    writeOrders(orders);

    // Simpan juga ke arsip penjualan permanen agar omset tetap tercatat walau antrean di-reset
    const sales = readSales();
    if (!sales.some((s) => s.orderId === newOrder.orderId)) {
      sales.unshift(newOrder);
      writeSales(sales);
    }

    return res.json({ success: true, data: newOrder });
  }

  return res.json({ success: true, data: exists });
});

// Update status pesanan menjadi Selesai
app.patch('/api/orders/:orderId', (req, res) => {
  const { orderId } = req.params;
  const orders = readOrders();
  const target = orders.find((o) => o.orderId === orderId);

  if (!target) {
    return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
  }

  target.status = 'Selesai';
  writeOrders(orders);

  const sales = readSales();
  const saleTarget = sales.find((s) => s.orderId === orderId);
  if (saleTarget) {
    saleTarget.status = 'Selesai';
    writeSales(sales);
  }

  res.json({ success: true, data: target });
});

// Reset antrean aktif ke #001 (arsip omset tetap aman)
app.post('/api/orders/reset', (req, res) => {
  try {
    const { resetPin } = req.body || {};
    const validResetPin = String(process.env.RESET_PIN || '9988').trim();

    if (!resetPin || String(resetPin).trim() !== validResetPin) {
      return res.status(401).json({
        success: false,
        message: 'PIN rahasia reset salah'
      });
    }

    writeOrders([]);
    return res.json({
      success: true,
      message: 'Antrean berhasil direset ke #001'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mereset antrean'
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Q-MATE server running on port ${PORT}`);
});
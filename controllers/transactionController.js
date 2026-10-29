// backend/controllers/transactionController.js
const { createSnapTransaction, getTransactionStatus: fetchMidtransStatus, verifyWebhookSignature, MIDTRANS_SERVER_KEY } = require('../config/midtrans');
const Transaction = require('../models/Transaction');
const queueService = require('../services/queueService');
const nodemailer = require('nodemailer');

// Helper: Fungsi Kirim Email Struk Q-MATE (Dengan Nomor Antrean yang Rapi/Pendek)
function sendReceiptEmail(customerEmail, customerName, items, totalAmount, orderId, queueNumber = '') {
  if (!customerEmail) return;
  
  // Tampilkan nomor antrean pendek jika ada (misal: #001), jika tidak pakai orderId yang diringkas
  const displayId = queueNumber ? `#${queueNumber}` : (orderId.includes('-') ? `#${orderId.split('-').pop().toUpperCase()}` : `#${orderId}`);

  const itemsHtml = items.map(i => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${i.name || i.nama} (x${i.qty})</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">Rp ${((i.price || i.harga) * i.qty).toLocaleString('id-ID')}</td>
    </tr>
  `).join('');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'zibrizabasit16@gmail.com',
      pass: 'rugucsgcbdxlhfwp'
    }
  });

  const mailOptions = {
    from: '"Q-MATE Booth B-04" <no-reply@qmate.com>',
    to: customerEmail,
    subject: `Struk & Nomor Antrean Q-MATE ${displayId}`,
    html: `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #C2410C; text-align: center; margin-bottom: 5px;">Q-MATE</h2>
        <p style="text-align: center; color: #718096; font-size: 14px; margin-top: 0;">Smart Queue & Payment System</p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 15px 0;">
        
        <p>Halo <strong>${customerName}</strong>,</p>
        <p>Pembayaran QRIS Anda telah berhasil diverifikasi! Berikut adalah detail pesanan dan nomor antrean Anda:</p>
        
        <div style="background: #FFEDD5; padding: 12px; border-radius: 8px; text-align: center; margin: 15px 0;">
          <span style="font-size: 12px; color: #9A3412; text-transform: uppercase; font-weight: bold; display: block;">Nomor Antrean Anda</span>
          <span style="font-size: 24px; font-weight: 800; color: #C2410C;">${displayId}</span>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 15px;">
          ${itemsHtml}
          <tr>
            <td style="padding: 10px 8px; font-weight: bold;">Total Pembayaran</td>
            <td style="padding: 10px 8px; font-weight: bold; text-align: right; color: #C2410C;">Rp ${totalAmount.toLocaleString('id-ID')}</td>
          </tr>
        </table>

        <p style="font-size: 13px; color: #718096; text-align: center; margin-top: 20px;">
          Silakan tunjukkan email ini atau tunggu panggilan nomor antrean di booth <strong>B-04</strong>.<br>Terima kasih telah memesan!
        </p>
      </div>
    `
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('[Q-MATE] Gagal mengirim email struk:', error);
    } else {
      console.log('[Q-MATE] Email struk berhasil dikirim:', info.response);
    }
  });
}

/**
 * POST /api/create-transaction
 * Membuat transaksi QRIS via Midtrans Snap
 */
async function createTransaction(req, res) {
  try {
    const {
      customerName,
      customerEmail,
      items,
      totalAmount,
      booth = 'B-04',
    } = req.body;

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Total amount harus lebih besar dari 0',
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items tidak boleh kosong',
      });
    }

    const orderId = `QMATE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const snapParams = {
      transaction_details: {
        order_id: orderId,
        gross_amount: parseInt(totalAmount),
      },
      customer_details: {
        first_name: customerName || 'Pelanggan',
        email: customerEmail || 'pelanggan@example.com',
        phone: req.body.customerPhone || '',
      },
      item_details: items.map((item, index) => ({
        id: `item-${index}`,
        price: parseInt(item.price || item.harga || 0),
        quantity: parseInt(item.qty || 1),
        name: item.name || item.nama || 'Piscok Lumer',
      })),
      callbacks: {
        finish: `${process.env.FRONTEND_SUCCESS_URL}?order_id=${orderId}&status=success`,
        error: `${process.env.FRONTEND_FAILURE_URL}?order_id=${orderId}&status=failed`,
        pending: `${process.env.FRONTEND_PENDING_URL}?order_id=${orderId}&status=pending`,
      },
      metadata: {
        booth,
        platform: 'web',
        source: 'q-mate',
      },
    };

    const result = await createSnapTransaction(snapParams);

    const transaction = Transaction.create({
      orderId: result.orderId,
      snapToken: result.snapToken,
      redirectUrl: result.redirectUrl,
      grossAmount: result.grossAmount,
      paymentType: result.paymentType,
      transactionTime: result.transactionTime,
      customerName: customerName || 'Pelanggan',
      customerEmail: customerEmail || '',
      items,
      midtransResponse: result.raw,
    });

    res.json({
      success: true,
      message: 'Transaksi berhasil dibuat',
      data: {
        orderId: transaction.orderId,
        snapToken: transaction.snapToken,
        redirectUrl: transaction.redirectUrl,
        grossAmount: transaction.grossAmount,
        paymentType: transaction.paymentType,
        booth,
      },
    });
  } catch (error) {
    console.error('❌ Create transaction error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat transaksi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * POST /api/send-receipt
 * Endpoint untuk kirim email langsung dengan nomor antrean yang rapi
 */
async function sendReceiptManual(req, res) {
  try {
    const { customerEmail, customerName, items, totalAmount, orderId, queueNumber } = req.body;
    
    if (!customerEmail) {
      return res.status(400).json({ success: false, message: 'Email tidak boleh kosong' });
    }

    sendReceiptEmail(customerEmail, customerName || 'Pelanggan', items, totalAmount, orderId, queueNumber);

    res.json({ success: true, message: 'Email struk berhasil diproses untuk dikirim' });
  } catch (error) {
    console.error('❌ Send receipt manual error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengirim email' });
  }
}

async function getTransactionStatus(req, res) {
  try {
    const { orderId } = req.params;
    const transaction = Transaction.findByOrderId(orderId);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }

    try {
      const midtransStatus = await fetchMidtransStatus(orderId);
      Transaction.updateStatus(orderId, midtransStatus.transactionStatus, midtransStatus.raw);
      res.json({ success: true, data: { orderId: midtransStatus.orderId, status: midtransStatus.transactionStatus } });
    } catch (midtransError) {
      res.json({ success: true, data: { orderId: transaction.orderId, status: transaction.status } });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memeriksa status transaksi' });
  }
}

async function midtransWebhook(req, res) {
  try {
    const body = req.body;
    const isValid = verifyWebhookSignature(body, MIDTRANS_SERVER_KEY);
    if (!isValid) return res.status(401).json({ success: false, message: 'Invalid signature' });

    const { order_id, transaction_status, payment_type, transaction_time } = body;
    const transaction = Transaction.updateStatus(order_id, transaction_status, body);

    if (!transaction) return res.status(200).json({ received: true });

    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      const orderData = {
        orderId: order_id,
        transactionId: body.transaction_id || order_id,
        customerName: transaction.customerName,
        items: transaction.items,
        totalAmount: transaction.grossAmount,
        paymentMethod: payment_type || 'QRIS',
        paymentTime: transaction_time || new Date().toISOString(),
      };

      queueService.addAntrean(orderData);

      if (transaction.customerEmail) {
        sendReceiptEmail(transaction.customerEmail, transaction.customerName, transaction.items, transaction.grossAmount, order_id);
      }

      res.json({ success: true, message: 'Webhook processed' });
    } else {
      res.json({ success: true, message: 'Webhook received' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Webhook processing error' });
  }
}

function getAntreanList(req, res) {
  const antrean = queueService.getAllAntrean();
  res.json({ success: true, data: antrean, total: antrean.length });
}

function getAntreanDetail(req, res) {
  const { orderId } = req.params;
  const antrean = queueService.getAntrean(orderId);
  if (!antrean) return res.status(404).json({ success: false, message: 'Antrean tidak ditemukan' });
  res.json({ success: true, data: antrean });
}

function panggilAntrean(req, res) {
  const antrean = queueService.panggilAntreanSelanjutnya();
  if (!antrean) return res.status(404).json({ success: false, message: 'Tidak ada antrean menunggu' });
  res.json({ success: true, message: 'Antrean dipanggil', data: antrean });
}

function selesaikanAntrean(req, res) {
  const { orderId } = req.params;
  const antrean = queueService.selesaikanAntrean(orderId);
  if (!antrean) return res.status(404).json({ success: false, message: 'Antrean tidak ditemukan' });
  res.json({ success: true, message: 'Antrean selesai', data: antrean });
}

module.exports = {
  createTransaction,
  sendReceiptManual,
  getTransactionStatus,
  midtransWebhook,
  getAntreanList,
  getAntreanDetail,
  panggilAntrean,
  selesaikanAntrean,
};
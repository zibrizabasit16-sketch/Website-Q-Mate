// backend/routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const {
  createTransaction,
  sendReceiptManual,
  getTransactionStatus,
  midtransWebhook,
  getAntreanList,
  getAntreanDetail,
  panggilAntrean,
  selesaikanAntrean,
} = require('../controllers/transactionController');

// ================= PAYMENT & EMAIL ROUTES =================

// Buat transaksi QRIS baru
router.post('/create-transaction', createTransaction);

// Kirim email struk manual setelah pembayaran sukses
router.post('/send-receipt', sendReceiptManual);

// Cek status transaksi
router.get('/transaction-status/:orderId', getTransactionStatus);

// Webhook Midtrans (dipanggil otomatis oleh Midtrans setelah pembayaran)
router.post('/webhook-midtrans', midtransWebhook);

// ================= QUEUE / ANTREAN ROUTES =================

// Lihat semua antrean (admin/dapur)
router.get('/antrean', getAntreanList);

// Detail antrean berdasarkan order ID
router.get('/antrean/:orderId', getAntreanDetail);

// Panggil antrean selanjutnya (untuk layar dapur/kasir)
router.post('/antrean/panggil', panggilAntrean);

// Tandai antrean selesai
router.post('/antrean/selesai/:orderId', selesaikanAntrean);

module.exports = router;
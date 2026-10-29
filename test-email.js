// backend/test-email.js
require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('Memulai tes koneksi email...');
console.log('Menggunakan Email:', process.env.EMAIL_USER);

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true untuk port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 10000 // Timeout 10 detik biar gak nyangkut terus
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ ERROR Verifikasi SMTP:', error);
  } else {
    console.log('✅ Koneksi SMTP Berhasil! Mengirim email uji coba...');
    
    transporter.sendMail({
      from: '"Q-MATE Test" <no-reply@qmate.com>',
      to: process.env.EMAIL_USER,
      subject: 'Test Email Q-MATE',
      text: 'Halo, ini email tes dari Q-MATE.'
    }, (err, info) => {
      if (err) {
        console.error('❌ GAGAL Kirim Email:', err);
      } else {
        console.log('✅ BERHASIL Kirim Email:', info.response);
      }
    });
  }
});
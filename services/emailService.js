// backend/services/emailService.js
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function sendReceiptEmail(customerEmail, customerName, items, totalAmount, orderId) {
  const itemsHtml = items.map(i => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${i.name} (x${i.qty})</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">Rp ${(i.price * i.qty).toLocaleString('id-ID')}</td>
    </tr>
  `).join('');

  const mailOptions = {
    from: '"Q-MATE Booth B-04" <no-reply@qmate.com>',
    to: customerEmail,
    subject: `Struk & Nomor Antrean Q-MATE #${orderId}`,
    html: `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #C2410C; text-align: center; margin-bottom: 5px;">Q-MATE</h2>
        <p style="text-align: center; color: #718096; font-size: 14px; margin-top: 0;">Smart Queue & Payment System</p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 15px 0;">
        
        <p>Halo <strong>${customerName}</strong>,</p>
        <p>Pembayaran QRIS Anda telah berhasil diverifikasi! Berikut adalah detail pesanan dan nomor antrean Anda:</p>
        
        <div style="background: #FFEDD5; padding: 12px; border-radius: 8px; text-align: center; margin: 15px 0;">
          <span style="font-size: 12px; color: #9A3412; text-transform: uppercase; font-weight: bold; display: block;">Nomor Antrean Anda</span>
          <span style="font-size: 24px; font-weight: 800; color: #C2410C;">#${orderId}</span>
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
      console.error('[Q-MATE] Gagal mengirim email:', error);
    } else {
      console.log('[Q-MATE] Email berhasil dikirim:', info.response);
    }
  });
}

module.exports = { sendReceiptEmail };
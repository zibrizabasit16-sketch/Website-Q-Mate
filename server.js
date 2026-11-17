const express = require('express');
const path = require('path');
const app = express();

// Port wajib mengikuti environment Railway secara mutlak
const PORT = process.env.PORT || 3000;

// Middleware dasar
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sajikan seluruh file statis di folder yang sama (termasuk index.html, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Route fallback ke index.html untuk semua request web utama
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Q-MATE Server is successfully running on port ${PORT}`);
});
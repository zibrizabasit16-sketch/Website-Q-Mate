/**
 * Queue Service - Sistem Antrean Real-time Q-MATE
 * Simpan antrean di memori (untuk produksi gunakan Redis/Database)
 */

class QueueService {
  constructor() {
    this.antrean = new Map(); // orderId -> antrean data
    this.queueNumber = 100; // nomor antrean awal (misal B-100)
    this.subscribers = new Set(); // callback untuk real-time notification
  }

  /**
   * Tambah antrean baru setelah pembayaran berhasil
   * @param {Object} orderData - data pesanan
   */
  addAntrean(orderData) {
    this.queueNumber += 1;
    const queueId = `${process.env.ANTRIAN_PREFIX || 'B'}-${String(this.queueNumber).padStart(3, '0')}`;

    const antrean = {
      id: queueId,
      orderId: orderData.orderId,
      transactionId: orderData.transactionId,
      customerName: orderData.customerName || 'Pelanggan',
      items: orderData.items || [],
      totalAmount: orderData.totalAmount || 0,
      paymentMethod: orderData.paymentMethod || 'QRIS',
      paymentTime: orderData.paymentTime || new Date().toISOString(),
      status: 'menunggu', // menunggu, diproses, selesai, dibatalkan
      booth: process.env.BOOTH_CODE || 'B-04',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.antrean.set(orderData.orderId, antrean);
    this.notifySubscribers('antrean_baru', antrean);

    return antrean;
  }

  /**
   * Dapatkan antrean berdasarkan orderId
   */
  getAntrean(orderId) {
    return this.antrean.get(orderId) || null;
  }

  /**
   * Dapatkan semua antrean
   */
  getAllAntrean() {
    return Array.from(this.antrean.values()).sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
  }

  /**
   * Update status antrean
   */
  updateAntreanStatus(orderId, newStatus) {
    const antrean = this.antrean.get(orderId);
    if (!antrean) return null;

    antrean.status = newStatus;
    antrean.updatedAt = new Date().toISOString();
    this.notifySubscribers('antrean_update', antrean);
    return antrean;
  }

  /**
   * Panggil antrean selanjutnya (untuk dapur/kasir)
   */
  panggilAntreanSelanjutnya() {
    const antreanMenunggu = this.getAllAntrean().filter(a => a.status === 'menunggu');
    if (antreanMenunggu.length === 0) return null;

    const next = antreanMenunggu[0];
    return this.updateAntreanStatus(next.orderId, 'diproses');
  }

  /**
   * Tandai antrean selesai
   */
  selesaikanAntrean(orderId) {
    return this.updateAntreanStatus(orderId, 'selesai');
  }

  /**
   * Subscribe ke update real-time (untuk Socket.io atau polling)
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(event, data) {
    this.subscribers.forEach(cb => {
      try { cb({ event, data, timestamp: new Date().toISOString() }); } catch (e) {}
    });
  }
}

module.exports = new QueueService();

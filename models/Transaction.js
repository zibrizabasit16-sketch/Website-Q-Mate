/**
 * Transaction Model - Simpan transaksi di memori
 * Untuk produksi, ganti dengan MongoDB/PostgreSQL/MySQL
 */

class TransactionModel {
  constructor() {
    this.transactions = new Map();
  }

  create(transactionData) {
    const transaction = {
      id: transactionData.orderId,
      orderId: transactionData.orderId,
      snapToken: transactionData.snapToken,
      redirectUrl: transactionData.redirectUrl,
      grossAmount: transactionData.grossAmount,
      paymentType: transactionData.paymentType || 'qris',
      transactionTime: transactionData.transactionTime,
      status: 'pending', // pending, success, failure, expired
      customerName: transactionData.customerName || '',
      customerEmail: transactionData.customerEmail || '',
      items: transactionData.items || [],
      midtransResponse: transactionData.midtransResponse || null,
      webhookReceived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.transactions.set(transaction.orderId, transaction);
    return transaction;
  }

  findByOrderId(orderId) {
    return this.transactions.get(orderId) || null;
  }

  updateStatus(orderId, status, midtransData = null) {
    const transaction = this.transactions.get(orderId);
    if (!transaction) return null;

    transaction.status = status;
    transaction.updatedAt = new Date().toISOString();
    if (midtransData) {
      transaction.midtransResponse = midtransData;
      transaction.webhookReceived = true;
    }

    this.transactions.set(orderId, transaction);
    return transaction;
  }

  getAll() {
    return Array.from(this.transactions.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }
}

module.exports = new TransactionModel();

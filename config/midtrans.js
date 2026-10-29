const Snap = require('midtrans-client').Snap;
const crypto = require('crypto');

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY;
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';

if (!MIDTRANS_SERVER_KEY || !MIDTRANS_CLIENT_KEY) {
  console.warn('⚠️  Midtrans keys not configured. Please set MIDTRANS_SERVER_KEY and MIDTRANS_CLIENT_KEY in .env');
}

// Inisialisasi instance Snap Midtrans dengan konfigurasi resmi
const snap = new Snap({
  isProduction: MIDTRANS_IS_PRODUCTION, // false = sandbox, true = production
  serverKey: MIDTRANS_SERVER_KEY,
  clientKey: MIDTRANS_CLIENT_KEY,
});

console.log(`🔧 Midtrans Snap diinisialisasi (isProduction: ${MIDTRANS_IS_PRODUCTION})`);

/**
 * Create Snap transaction token via Midtrans Snap API (official SDK)
 * @param {Object} params - transaction parameters
 */
async function createSnapTransaction(params) {
  try {
    const response = await snap.createTransaction(params);

    return {
      success: true,
      snapToken: response.token,
      redirectUrl: response.redirect_url,
      orderId: params.transaction_details.order_id,
      grossAmount: params.transaction_details.gross_amount,
      paymentType: 'qris',
      transactionTime: new Date().toISOString(),
      raw: response,
    };
  } catch (error) {
    console.error('❌ Midtrans create transaction error:', error.message);
    if (error.apiResponse) {
      console.error('❌ Midtrans API response:', error.apiResponse);
    }
    throw new Error(error.message || 'Failed to create transaction');
  }
}

/**
 * Get transaction status from Midtrans
 * @param {string} orderId - order ID
 */
async function getTransactionStatus(orderId) {
  try {
    const response = await snap.transaction.status(orderId);

    return {
      success: true,
      orderId: response.order_id,
      transactionStatus: response.transaction_status,
      fraudStatus: response.fraud_status,
      paymentType: response.payment_type,
      grossAmount: response.gross_amount,
      currency: response.currency,
      transactionTime: response.transaction_time,
      settlementTime: response.settlement_time,
      raw: response,
    };
  } catch (error) {
    console.error('❌ Midtrans get status error:', error.message);
    if (error.apiResponse) {
      console.error('❌ Midtrans API response:', error.apiResponse);
    }
    throw new Error(error.message || 'Failed to get transaction status');
  }
}

/**
 * Verify Midtrans webhook signature
 * @param {Object} body - webhook request body
 * @param {string} serverKey - Midtrans server key
 */
function verifyWebhookSignature(body, serverKey) {
  try {
    const { order_id, status_code, gross_amount, signature_key } = body;

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return false;
    }

    const hashInput = `${order_id}${status_code}${gross_amount}${serverKey}`;
    const expectedSignature = crypto.createHash('sha512').update(hashInput).digest('hex');

    return expectedSignature === signature_key;
  } catch (error) {
    console.error('❌ Signature verification error:', error.message);
    return false;
  }
}

module.exports = {
  createSnapTransaction,
  getTransactionStatus,
  verifyWebhookSignature,
  snap,
  MIDTRANS_SERVER_KEY,
  MIDTRANS_CLIENT_KEY,
  MIDTRANS_IS_PRODUCTION,
};

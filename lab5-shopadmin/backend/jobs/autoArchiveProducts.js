// jobs/autoArchiveProducts.js - Lab 5 Ex3 extended: archive products that stayed out of stock
const cron = require('node-cron');
const Product = require('../models/product.model');

// Production: every hour, archive after 24 hours (1440 minutes).
// For testing in class: ARCHIVE_CRON='* * * * *' and ARCHIVE_AFTER_MINUTES=2 in .env
const SCHEDULE = process.env.ARCHIVE_CRON || '0 * * * *';
const AFTER_MINUTES = Number(process.env.ARCHIVE_AFTER_MINUTES) || 24 * 60;

async function archiveOutOfStockProducts() {
  const cutoff = new Date(Date.now() - AFTER_MINUTES * 60 * 1000);
  // status: { $ne: 'archived' } also matches old products that have no status field yet
  const result = await Product.updateMany(
    { status: { $ne: 'archived' }, quantity: 0, updatedAt: { $lte: cutoff } },
    { $set: { status: 'archived' } }
  );
  return result.modifiedCount;
}

function startAutoArchiveJob() {
  cron.schedule(SCHEDULE, async () => {
    console.log('[CRON] Running auto-archive at', new Date().toISOString());
    try {
      const count = await archiveOutOfStockProducts();
      // always log, even 0 - a silent job is impossible to debug later
      console.log(`[CRON] Auto-archive: ${count} product(s) archived`);
    } catch (error) {
      // its own try/catch: a failure here never stops the other jobs
      console.error('[CRON] Auto-archive failed:', error.message);
    }
  }, { timezone: 'Asia/Ho_Chi_Minh' });
  console.log(`[CRON] Auto-archive scheduled: "${SCHEDULE}", out of stock for ${AFTER_MINUTES} minute(s)`);
}

module.exports = { startAutoArchiveJob, archiveOutOfStockProducts };

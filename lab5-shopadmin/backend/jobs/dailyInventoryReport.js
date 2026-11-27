// jobs/dailyInventoryReport.js - Lab 5 Ex3: daily inventory report per category
const cron = require('node-cron');
const Product = require('../models/product.model');
const Category = require('../models/category.model');

// Production: '0 0 * * *' (midnight). For testing set INVENTORY_REPORT_CRON='* * * * *' in .env (every minute)
const SCHEDULE = process.env.INVENTORY_REPORT_CRON || '0 0 * * *';

async function buildInventoryReport() {
  return Product.aggregate([
    {
      // one group per category
      $group: {
        _id: '$categoryId',
        totalProducts: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        stockValue: { $sum: { $multiply: ['$price', '$quantity'] } }
      }
    },
    // join the categories collection to get the category name
    { $lookup: { from: Category.collection.name, localField: '_id', foreignField: '_id', as: 'category' } },
    {
      $project: {
        _id: 0,
        totalProducts: 1,
        totalQuantity: 1,
        stockValue: 1,
        category: { $ifNull: [{ $arrayElemAt: ['$category.name', 0] }, 'Unknown'] }
      }
    },
    { $sort: { category: 1 } }
  ]);
}

function startDailyInventoryReportJob() {
  cron.schedule(SCHEDULE, async () => {
    console.log('[CRON] Running inventory report at', new Date().toISOString());
    try {
      const report = await buildInventoryReport();
      console.log('[CRON] Inventory by category:');
      console.table(report);
    } catch (error) {
      // A cron job runs INSIDE the API process: an uncaught error here could crash the whole server
      console.error('[CRON] Inventory report failed:', error.message);
    }
  }, { timezone: 'Asia/Ho_Chi_Minh' });
  console.log(`[CRON] Inventory report scheduled: "${SCHEDULE}"`);
}

module.exports = { startDailyInventoryReportJob, buildInventoryReport };

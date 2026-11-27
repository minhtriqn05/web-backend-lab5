// jobs/dailyRevenueReport.js - Lab 5 homework, Requirement 5
const cron = require('node-cron');
const Order = require('../models/order.model');

// Production: '0 0 * * *' (midnight). For the video demo set REVENUE_REPORT_CRON='* * * * *' in .env
const SCHEDULE = process.env.REVENUE_REPORT_CRON || '0 0 * * *';
const VN_OFFSET_MS = 7 * 60 * 60 * 1000; // Vietnam is UTC+7 all year (no daylight saving)

// Midnight (00:00) of today in Vietnam, as a real Date
function startOfTodayVN(now = new Date()) {
  const vn = new Date(now.getTime() + VN_OFFSET_MS); // shift so the UTC fields show Vietnam time
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) - VN_OFFSET_MS);
}

async function buildRevenueReport(now = new Date()) {
  const to = startOfTodayVN(now);                       // today 00:00
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000); // yesterday 00:00

  const [result] = await Order.aggregate([
    { $match: { status: 'completed', createdAt: { $gte: from, $lt: to } } },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              orders: { $sum: 1 },
              revenue: { $sum: '$totalAmount' },
              itemsSold: { $sum: { $sum: '$items.quantity' } },
              customers: { $addToSet: '$userId' }
            }
          },
          { $project: { _id: 0, orders: 1, revenue: 1, itemsSold: 1, customers: { $size: '$customers' } } }
        ],
        topProducts: [
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.productId',
              product: { $first: '$items.name' },
              quantity: { $sum: '$items.quantity' },
              revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
            }
          },
          { $sort: { revenue: -1 } },
          { $limit: 5 },
          { $project: { _id: 0, product: 1, quantity: 1, revenue: 1 } }
        ]
      }
    }
  ]);

  const summary = result.summary[0] || { orders: 0, revenue: 0, itemsSold: 0, customers: 0 };
  return { from, to, ...summary, topProducts: result.topProducts };
}

function startDailyRevenueReportJob() {
  cron.schedule(SCHEDULE, async () => {
    console.log('[CRON] Running daily revenue report at', new Date().toISOString());
    try {
      const r = await buildRevenueReport();
      const day = new Date(r.from.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
      console.log(`[CRON] Revenue report for ${day} (completed orders, ${r.from.toISOString()} -> ${r.to.toISOString()})`);
      console.log(`[CRON]   Orders: ${r.orders} | Customers: ${r.customers} | Items sold: ${r.itemsSold} | Revenue: ${r.revenue.toLocaleString('en-US')} VND`);
      if (r.topProducts.length) {
        console.log('[CRON]   Top products:');
        console.table(r.topProducts);
      }
    } catch (error) {
      console.error('[CRON] Daily revenue report failed:', error.message);
    }
  }, { timezone: 'Asia/Ho_Chi_Minh' });
  console.log(`[CRON] Daily revenue report scheduled: "${SCHEDULE}"`);
}

module.exports = { startDailyRevenueReportJob, buildRevenueReport, startOfTodayVN };

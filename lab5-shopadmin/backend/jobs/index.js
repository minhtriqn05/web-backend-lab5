// jobs/index.js - start every scheduled job once
const { startDailyInventoryReportJob } = require('./dailyInventoryReport');
const { startAutoArchiveJob } = require('./autoArchiveProducts');
const { startDailyRevenueReportJob } = require('./dailyRevenueReport');

function startJobs() {
  // Under PM2 cluster mode every worker would start its own copy of each job,
  // so only the first instance (NODE_APP_INSTANCE '0') runs them. With plain "node server.js" it is undefined.
  const instance = process.env.NODE_APP_INSTANCE;
  if (instance !== undefined && instance !== '0') return;

  startDailyInventoryReportJob();
  startAutoArchiveJob();
  startDailyRevenueReportJob();
}

module.exports = startJobs;

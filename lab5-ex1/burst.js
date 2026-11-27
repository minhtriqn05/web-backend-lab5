// burst.js - send many requests and count which worker answered
// Usage: node burst.js [totalRequests] [concurrency] [path]
//   node burst.js 5000 100          -> /health (very light)
//   node burst.js 3000 50 /work     -> /work (CPU-heavy, to watch CPU in pm2 monit)
const TOTAL = Number(process.argv[2]) || 2000;
const CONCURRENCY = Number(process.argv[3]) || 50;
const PATH = process.argv[4] || '/health';
const URL = `http://localhost:5001${PATH}`;

const answeredBy = {}; // pid -> number of responses
let sent = 0;
let failed = 0;

async function worker() {
  while (sent < TOTAL) {
    sent++;
    try {
      const res = await fetch(URL);
      const body = await res.json();
      answeredBy[body.pid] = (answeredBy[body.pid] || 0) + 1;
    } catch (error) {
      failed++;
    }
  }
}

(async () => {
  const start = Date.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`Sent ${TOTAL} requests in ${Date.now() - start} ms (${failed} failed)`);
  console.table(Object.entries(answeredBy).map(([pid, count]) => ({ pid, requests: count })));
})();

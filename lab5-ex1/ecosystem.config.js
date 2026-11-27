// ecosystem.config.js - how PM2 should run this app
module.exports = {
  apps: [{
    name: 'shop-api',
    script: './server.js',
    instances: 4,           // 4 workers (use 'max' for one worker per CPU core)
    exec_mode: 'cluster',   // PM2's built-in load balancer shares port 5001 between the workers
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    }
  }]
};

# Lab 5 – Process Management, Real-Time & Scheduled Jobs

**Course:** Web Application and Database Development Practicum (Backend & Database) – CSBU109
**Student:** Nguyen Minh Tri – 23560042

| Folder | Content | Port |
|---|---|---|
| `lab5-ex1/` | Exercise 1 – the Lab 4 Products API run with **PM2** in cluster mode (`/health`, `/crash`, `ecosystem.config.js`, `burst.js`) | 5001 |
| `lab5-shopadmin/` | Exercises 2, 3 and the homework – the ShopAdmin backend (MongoDB + Mongoose) with **Socket.IO**, **node-cron**, **Orders**, **Sign in with Google** and **Gmail** emails, plus the provided Web UI | 4000 |

## Exercise 1 – PM2

```bash
npm install -g pm2
cd lab5-ex1
npm install
pm2 start ecosystem.config.js   # 4 workers in cluster mode
pm2 list
node burst.js 2000 50           # many requests to /health -> see which pid answered
pm2 monit
```

## Exercises 2, 3 and homework – ShopAdmin

See [`lab5-shopadmin/README.md`](lab5-shopadmin/README.md).

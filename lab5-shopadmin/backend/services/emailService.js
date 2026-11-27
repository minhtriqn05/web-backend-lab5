// services/emailService.js - real emails through Gmail SMTP (Lab 5 homework, Requirement 4)
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,               // your-shop@gmail.com
    pass: process.env.GMAIL_APP_PASSWORD        // the 16-character App Password, NOT the login password
  }
});

async function sendMail(to, subject, html) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('[EMAIL] GMAIL_USER / GMAIL_APP_PASSWORD missing in .env - email not sent');
    return null;
  }
  const info = await transporter.sendMail({
    from: `"ShopAdmin Store" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html
  });
  console.log(`[EMAIL] Sent "${subject}" to ${to} - messageId ${info.messageId}`);
  return info;
}

// ---------- HTML templates ----------
const money = (n) => Number(n).toLocaleString('en-US');
const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shortId = (id) => `#${String(id).slice(-6).toUpperCase()}`;

function itemsTable(order) {
  const rows = order.items.map((i) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${escape(i.name)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${money(i.price)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${money(i.price * i.quantity)}</td>
    </tr>`).join('');
  return `
    <table style="border-collapse:collapse;width:100%;max-width:560px;font-size:14px">
      <tr style="background:#eef2ff">
        <th style="padding:6px 10px;text-align:left">Product</th>
        <th style="padding:6px 10px;text-align:right">Price</th>
        <th style="padding:6px 10px">Qty</th>
        <th style="padding:6px 10px;text-align:right">Subtotal</th>
      </tr>
      ${rows}
      <tr>
        <td colspan="3" style="padding:8px 10px;text-align:right"><b>Total</b></td>
        <td style="padding:8px 10px;text-align:right"><b>${money(order.totalAmount)} VND</b></td>
      </tr>
    </table>`;
}

function sendOrderConfirmation(user, order) {
  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2937">
      <h2 style="color:#4f46e5">Thank you for your order, ${escape(user.fullName)}!</h2>
      <p>We have received your order <b>${shortId(order._id)}</b> on ${new Date(order.createdAt).toLocaleString('en-GB')}.</p>
      ${itemsTable(order)}
      <p>Current status: <b>${order.status}</b>. We will email you again when it changes.</p>
      <p style="color:#6b7280;font-size:12px">ShopAdmin - Lab 5</p>
    </div>`;
  return sendMail(user.email, `Order ${shortId(order._id)} confirmed`, html);
}

function sendOrderStatusUpdate(user, order) {
  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2937">
      <h2 style="color:#4f46e5">Your order ${shortId(order._id)} is now ${order.status}</h2>
      <p>Hi ${escape(user.fullName)}, the status of your order has been changed to <b>${order.status}</b>.</p>
      ${itemsTable(order)}
      <p style="color:#6b7280;font-size:12px">ShopAdmin - Lab 5</p>
    </div>`;
  return sendMail(user.email, `Order ${shortId(order._id)} is now ${order.status}`, html);
}

module.exports = { sendMail, sendOrderConfirmation, sendOrderStatusUpdate };

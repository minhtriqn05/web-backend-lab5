// socket.js - Socket.IO setup: JWT handshake auth + rooms
//   user:<id>  -> private room of one user (order status updates)
//   admins     -> every connected admin (new user registrations)
//   products   -> users who are looking at the Products page (live product updates)
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const PRODUCTS_ROOM = 'products';
const ADMINS_ROOM = 'admins';

function initSocket(httpServer) {
  const io = new Server(httpServer, { cors: { origin: '*' } });

  // Reject the connection unless the client sends a valid JWT: io(url, { auth: { token } })
  io.use((socket, next) => {
    try {
      const decoded = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userType = decoded.type;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    // Only admins join the admins room, so normal users never receive admin broadcasts
    if (socket.userType === 'admin') socket.join(ADMINS_ROOM);
    console.log(`[SOCKET] User ${socket.userId} (${socket.userType}) connected (socket ${socket.id})`);

    // The client tells us when it opens / leaves the Products page,
    // so updates only go to users who are currently looking at it
    socket.on('products:join', () => socket.join(PRODUCTS_ROOM));
    socket.on('products:leave', () => socket.leave(PRODUCTS_ROOM));

    socket.on('disconnect', (reason) => {
      console.log(`[SOCKET] User ${socket.userId} disconnected (socket ${socket.id}, ${reason})`);
    });
  });

  return io;
}

module.exports = { initSocket, PRODUCTS_ROOM, ADMINS_ROOM };

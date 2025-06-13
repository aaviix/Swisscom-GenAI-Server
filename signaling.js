const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();  // Load environment variables from .env file

// Create HTTP server for Socket.io to attach to
const httpServer = http.createServer();

// Attach a new Socket.io instance with restricted CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',  // Allow connections only from this origin
    methods: ['GET', 'POST'],
  },
});

// Handle incoming WebSocket connections
io.on('connection', (socket) => {
  console.log(`New signaling connection: ${socket.id}`);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`${socket.id} joined room ${roomId}`);
    socket.to(roomId).emit('peer-joined', { peerId: socket.id });
  });

  socket.on('webrtc-offer', ({ roomId, offer, toPeerId }) => {
    io.to(toPeerId).emit('webrtc-offer', {
      fromPeerId: socket.id,
      offer,
    });
  });

  socket.on('webrtc-answer', ({ roomId, answer, toPeerId }) => {
    io.to(toPeerId).emit('webrtc-answer', {
      fromPeerId: socket.id,
      answer,
    });
  });

  socket.on('webrtc-ice-candidate', ({ roomId, candidate, toPeerId }) => {
    io.to(toPeerId).emit('webrtc-ice-candidate', {
      fromPeerId: socket.id,
      candidate,
    });
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    socket.rooms.forEach((room) => {
      socket.to(room).emit('peer-left', { peerId: socket.id });
    });
  });
});

// Listen on specified port
const PORT = process.env.SIGNALING_PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Signaling server is running on port ${PORT}`);
});

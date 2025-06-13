// server/signaling.js
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config(); // Load environment variables from .env file

// 1. Create a plain HTTP server (no Express required)
const httpServer = http.createServer();

// 2. Attach a new Socket.io instance with restricted CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*', // Allow connections only from this origin
    methods: ['GET', 'POST'],
  },
});

// 3. In‐memory mapping of rooms to socket IDs (very simple; you might improve later)
//    A “room” here is just a unique identifier for each user/agent pair.
io.on('connection', (socket) => {
  console.log(`New signaling connection: ${socket.id}`);

  // Handle joining a room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`${socket.id} joined room ${roomId}`);

    // Notify others in the room that a new peer has arrived
    socket.to(roomId).emit('peer-joined', { peerId: socket.id });
  });

  // Relay “offer” to other peer(s) in the same room
  socket.on('webrtc-offer', ({ roomId, offer, toPeerId }) => {
    io.to(toPeerId).emit('webrtc-offer', {
      fromPeerId: socket.id,
      offer,
    });
  });

  // Relay “answer” back
  socket.on('webrtc-answer', ({ roomId, answer, toPeerId }) => {
    io.to(toPeerId).emit('webrtc-answer', {
      fromPeerId: socket.id,
      answer,
    });
  });

  // Relay ICE candidates
  socket.on('webrtc-ice-candidate', ({ roomId, candidate, toPeerId }) => {
    io.to(toPeerId).emit('webrtc-ice-candidate', {
      fromPeerId: socket.id,
      candidate,
    });
  });

  // Handle disconnects
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    // Broadcast to rooms that this peer left (you can do socket.rooms to enumerate)
    socket.rooms.forEach((room) => {
      socket.to(room).emit('peer-left', { peerId: socket.id });
    });
  });
});

// 4. Listen on the port provided by Render (or use 4000 if not defined)
const PORT = process.env.SIGNALING_PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Signaling server is running on port ${PORT}`);
});

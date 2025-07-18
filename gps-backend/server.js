const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const dotenv = require('dotenv');
const app = require('./src/app');
const conductorRoutes = require('./src/routes/conductorRoutes');
const socketHandler = require('./src/sockets/socketHandler');

dotenv.config();

const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*", // O configura tu dominio React si lo usas
    methods: ["GET", "POST"]
  }
});

// Rutas API REST
app.use('/api/conductores', conductorRoutes);

// Socket.IO
socketHandler(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor HTTP y Socket.IO activo en http://localhost:${PORT}`);
});

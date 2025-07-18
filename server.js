const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const conductorRoutes = require('./routes/conductorRoutes');
const db = require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/conductores', conductorRoutes);

// Crear servidor HTTP
const server = http.createServer(app);

// Configurar Socket.IO (opcional, si planeas usarlo más adelante)
const io = new Server(server);

// Escuchar en el puerto proporcionado por Render o 4000 por defecto
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor HTTP y Socket.IO activo en http://localhost:${PORT}`);
});

// Probar la conexión a la base de datos
db.connect((err) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err);
  } else {
    console.log('✅ Conexión exitosa a la base de datos');
  }
});

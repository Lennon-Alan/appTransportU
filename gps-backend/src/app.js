const express = require('express');
const cors = require('cors');
const app = express();
const trackingRoutes = require('./routes/trackingRoutes');



app.use(cors());
app.use(express.json());

app.use('/api/tracking', trackingRoutes);
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/rutas', require('./routes/rutaRoutes'));
app.use('/api/tracking', require('./routes/trackingRoutes'));

module.exports = app;

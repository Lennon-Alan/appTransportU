const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middlewares/authMiddleware');

// 🔄 POST: Guardar ubicación del conductor
router.post('/ubicacion', authMiddleware, async (req, res) => {
  const conductorId = req.user.id; // ✅ corrección aquí
  const { lat, lon, velocidad, direccion } = req.body;

  if (!lat || !lon) {
    return res.status(400).json({ message: 'Latitud y longitud son obligatorias' });
  }

  try {
    await pool.query(
      `INSERT INTO ubicaciones_conductores 
       (conductor_id, posicion, velocidad, direccion)
       VALUES (
         $1,
         ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
         $4, $5
       )`,
      [conductorId, lon, lat, velocidad || null, direccion || null]
    );

    res.status(201).json({ message: 'Ubicación guardada correctamente' });
  } catch (err) {
    console.error('Error al guardar ubicación:', err);
    res.status(500).json({ message: 'Error al guardar ubicación' });
  }
});

// 🕓 GET: Historial del conductor autenticado
router.get('/historial', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM ubicaciones_conductores 
       WHERE conductor_id = $1
       ORDER BY timestamp DESC
       LIMIT 100`,
      [req.user.id] // ✅ uso correcto
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener historial:', err);
    res.status(500).json({ message: 'Error al obtener historial' });
  }
});

module.exports = router;

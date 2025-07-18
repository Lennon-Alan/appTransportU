// routes/rutaRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middlewares/authMiddleware');

// GET /api/rutas (público)
router.get('/rutas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM rutas');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener rutas' });
  }
});

// GET /api/paraderos/:ruta_id (protegido opcionalmente)
router.get('/paraderos/:ruta_id', authMiddleware, async (req, res) => {
  const { ruta_id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM paraderos WHERE ruta_id = $1',
      [ruta_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener paraderos' });
  }
});

module.exports = router;

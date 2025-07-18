const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const pool = require('../config/db');

// 📋 Ruta: GET /api/conductores (Listar todos los conductores)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre, email, placa FROM conductores');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar conductores:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// 📋 Ruta: GET /api/conductores/:id (Obtener un conductor)
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT id, nombre, email, placa FROM conductores WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Conductor no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener conductor:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ✏️ Ruta: PUT /api/conductores/:id (Actualizar un conductor)
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { nombre, email, password, placa } = req.body;
  try {
    const updateFields = [];
    const values = [];
    let query = 'UPDATE conductores SET ';
    let paramIndex = 1;

    if (nombre) {
      updateFields.push(`nombre = $${paramIndex++}`);
      values.push(nombre);
    }
    if (email) {
      updateFields.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push(`password = $${paramIndex++}`);
      values.push(hashedPassword);
    }
    if (placa) {
      updateFields.push(`placa = $${paramIndex++}`);
      values.push(placa);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron datos para actualizar' });
    }

    values.push(id);
    query += updateFields.join(', ') + ` WHERE id = $${paramIndex} RETURNING id, nombre, email, placa`;

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Conductor no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar conductor:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// 🗑️ Ruta: DELETE /api/conductores/:id (Eliminar un conductor)
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM conductores WHERE id = $1 RETURNING id, nombre, email, placa', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Conductor no encontrado' });
    }
    res.json({ message: 'Conductor eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar conductor:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;

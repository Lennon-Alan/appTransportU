const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const authMiddleware = require('../middlewares/authMiddleware');

// 📥 Ruta: POST /api/conductores/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log("🔐 Login recibido:", email);

  try {
    const result = await pool.query('SELECT * FROM conductores WHERE email = $1', [email]);
    const conductor = result.rows[0];

    if (!conductor) {
      console.log("❌ No se encontró el conductor");
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const esValido = await bcrypt.compare(password, conductor.password);
    if (!esValido) {
      console.log("❌ Contraseña incorrecta");
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const token = jwt.sign({ id: conductor.id }, process.env.JWT_SECRET, {
      expiresIn: "2h"
    });

    res.json({ token });
  } catch (error) {
    console.error("❌ Error en login:", error.message);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// 🔐 Ruta protegida: GET /api/conductores/perfil
router.get('/perfil', authMiddleware, async (req, res) => {
  const conductorId = req.user.id;

  try {
    const result = await pool.query(
      'SELECT id, nombre, email, placa FROM conductores WHERE id = $1',
      [conductorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Conductor no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener perfil del conductor:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;

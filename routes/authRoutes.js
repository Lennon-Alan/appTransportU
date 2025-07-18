const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// 📥 Ruta: POST /api/auth/register
router.post('/register', async (req, res) => {
  const { nombre, email, password, placa } = req.body;
  try {
    const emailExists = await pool.query('SELECT 1 FROM conductores WHERE email = $1', [email]);
    if (emailExists.rows.length > 0) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }
    const placaExists = await pool.query('SELECT 1 FROM conductores WHERE placa = $1', [placa]);
    if (placaExists.rows.length > 0) {
      return res.status(400).json({ message: 'La placa ya está registrada' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO conductores (nombre, email, password, placa) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, placa',
      [nombre, email, hashedPassword, placa]
    );
    const usuario = result.rows[0];
    const token = jwt.sign({ id: usuario.id, email: usuario.email }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.status(201).json({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      placa: usuario.placa,
      token
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// 📥 Ruta: POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log("🔐 Login recibido:", email);

  try {
    const result = await pool.query('SELECT * FROM conductores WHERE email = $1', [email]);
    const conductor = result.rows[0];

    if (!conductor) {
      console.log("❌ No se encontró el conductor");
      return res.status(401).json({ message: 'Correo no registrado' });
    }

    const esValido = await bcrypt.compare(password, conductor.password);
    if (!esValido) {
      console.log("❌ Contraseña incorrecta");
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    const token = jwt.sign({ id: conductor.id, email: conductor.email }, process.env.JWT_SECRET, {
      expiresIn: "2h"
    });

    res.json({
      id: conductor.id,
      nombre: conductor.nombre,
      email: conductor.email,
      placa: conductor.placa,
      token
    });
  } catch (error) {
    console.error("❌ Error en login:", error.message);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;

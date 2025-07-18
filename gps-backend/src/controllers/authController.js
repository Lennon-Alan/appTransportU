const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mapamapa8siayagames';

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM conductores WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Correo no registrado' });
    }

    const usuario = result.rows[0];
    console.log("🔐 Comparando:", password, "vs hash:", usuario.password);

    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    const token = jwt.sign({ id: usuario.id, email: usuario.email }, JWT_SECRET, {
      expiresIn: '2h'
    });

    res.json({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      placa: usuario.placa,
      token
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

exports.register = async (req, res) => {
  const { nombre, email, password, placa } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO conductores (nombre, email, password, placa) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, email, hashedPassword, placa]
    );

    const usuario = result.rows[0];

    const token = jwt.sign({ id: usuario.id, email: usuario.email }, JWT_SECRET, {
      expiresIn: '2h'
    });

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
};

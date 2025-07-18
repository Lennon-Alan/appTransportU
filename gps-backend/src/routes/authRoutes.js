const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/authController');

// POST /login
router.post('/login', login);

// POST /register
router.post('/register', register);

module.exports = router;

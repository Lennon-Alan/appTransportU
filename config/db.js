const { Pool } = require('pg');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Necesario para Render
    }
  });

  pool.connect((err) => {
    if (err) {
      console.error('Error conectando a la base de datos:', err.stack);
    } else {
      console.log('✅ Conexión exitosa a la base de datos');
    }
  });

  module.exports = pool;
